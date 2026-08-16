-- ============================================================================
-- MIGRACIÓN INCREMENTAL: INTEGRIDAD DE RESULTADOS Y SUBMISSION_ID IDEMPOTENTE
-- UEEH MATEMÁTICAS 3.º BGU (SEGUNDO TRIMESTRE EN ADELANTE)
-- ============================================================================

-- 1. Eliminar defaults de fechas en public.activity_results
ALTER TABLE public.activity_results ALTER COLUMN first_completed_at DROP DEFAULT;
ALTER TABLE public.activity_results ALTER COLUMN last_completed_at DROP DEFAULT;

-- 2. Restricción de integridad en public.activity_results para prevenir estados incoherentes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'activity_results' AND constraint_name = 'chk_activity_results_integrity'
  ) THEN
    ALTER TABLE public.activity_results DROP CONSTRAINT chk_activity_results_integrity;
  END IF;
END $$;

ALTER TABLE public.activity_results ADD CONSTRAINT chk_activity_results_integrity CHECK (
  (
    result_status = 'completed' AND
    result_source = 'student_submission' AND
    attempt_count >= 1 AND
    first_completed_at IS NOT NULL AND
    last_completed_at IS NOT NULL
  ) OR (
    result_status = 'not_submitted' AND
    result_source = 'deadline_auto' AND
    attempt_count = 0 AND
    first_completed_at IS NULL AND
    last_completed_at IS NULL
  )
);

-- 3. Añadir submission_id a public.activity_attempts para idempotencia
ALTER TABLE public.activity_attempts ADD COLUMN IF NOT EXISTS submission_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.activity_attempts ALTER COLUMN submission_id DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'activity_attempts' AND constraint_name = 'uq_activity_student_submission'
  ) THEN
    ALTER TABLE public.activity_attempts
      ADD CONSTRAINT uq_activity_student_submission UNIQUE (activity_id, student_id, submission_id);
  END IF;
END $$;

-- 4. Reescribir private.finalize_overdue_activities de forma set-based e idempotente
CREATE OR REPLACE FUNCTION private.finalize_overdue_activities()
RETURNS integer AS $$
DECLARE
  v_inserted_count integer := 0;
BEGIN
  INSERT INTO public.activity_results (
    activity_id,
    student_id,
    best_score,
    attempt_count,
    result_status,
    result_source,
    first_completed_at,
    last_completed_at
  )
  SELECT 
    a.id AS activity_id,
    s.id AS student_id,
    a.minimum_score AS best_score,
    0 AS attempt_count,
    'not_submitted' AS result_status,
    'deadline_auto' AS result_source,
    NULL AS first_completed_at,
    NULL AS last_completed_at
  FROM public.activities a
  JOIN public.enrollments e ON e.class_section_id = a.class_section_id AND e.status = 'active'
  JOIN public.students s ON s.id = e.student_id AND s.status = 'active'
  WHERE a.is_active = true
    AND a.due_at IS NOT NULL
    AND a.due_at < now()
    AND e.enrolled_at <= a.due_at
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_attempts att
      WHERE att.activity_id = a.id AND att.student_id = s.id
    )
  ON CONFLICT (activity_id, student_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.finalize_overdue_activities() FROM PUBLIC, anon, authenticated, service_role;

-- 5. Eliminar firmas antiguas de record_activity_attempt (sin submission_id)
DROP FUNCTION IF EXISTS public.record_activity_attempt(uuid, uuid, numeric, jsonb);
DROP FUNCTION IF EXISTS private.record_activity_attempt(uuid, uuid, numeric, jsonb);

-- 6. Crear firma con submission_id idempotente
CREATE OR REPLACE FUNCTION private.record_activity_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_submission_id uuid,
  p_score numeric,
  p_submission_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_max_score numeric(5,2);
  v_min_score numeric(5,2);
  v_opens_at timestamptz;
  v_due_at timestamptz;
  v_next_attempt_number integer;
  v_existing_attempt RECORD;
  v_existing_results RECORD;
  v_now timestamptz := now();
BEGIN
  -- Concurrencia segura: Lock determinista por estudiante y actividad
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text));

  -- 1. Detección de Retry Idempotente: Si el submission_id ya fue registrado, devolver confirmación sin reinsertar
  SELECT att.*, act.max_score INTO v_existing_attempt
  FROM public.activity_attempts att
  JOIN public.activities act ON act.id = att.activity_id
  WHERE att.activity_id = p_activity_id 
    AND att.student_id = p_student_id 
    AND att.submission_id = p_submission_id;

  IF v_existing_attempt.id IS NOT NULL THEN
    SELECT * INTO v_existing_results
    FROM public.activity_results
    WHERE activity_id = p_activity_id AND student_id = p_student_id;

    RETURN jsonb_build_object(
      'success', true,
      'is_retry', true,
      'activity_id', p_activity_id,
      'student_id', p_student_id,
      'submission_id', p_submission_id,
      'attempt_number', v_existing_attempt.attempt_number,
      'score', v_existing_attempt.score,
      'max_score', v_existing_attempt.max_score,
      'best_score', COALESCE(v_existing_results.best_score, v_existing_attempt.score),
      'attempt_count', COALESCE(v_existing_results.attempt_count, 1),
      'registered_at', v_existing_attempt.completed_at
    );
  END IF;

  -- 2. Nueva Entrega: Consultar estado y plazo de la actividad
  SELECT max_score, minimum_score, opens_at, due_at 
  INTO v_max_score, v_min_score, v_opens_at, v_due_at
  FROM public.activities 
  WHERE id = p_activity_id AND is_active = true;

  IF v_max_score IS NULL THEN
    RAISE EXCEPTION 'Actividad inactiva o inexistente';
  END IF;

  -- Validar ventana de disponibilidad oficial por servidor
  IF v_opens_at IS NOT NULL AND v_now < v_opens_at THEN
    RAISE EXCEPTION 'La actividad todavía no está disponible';
  END IF;

  IF v_due_at IS NOT NULL AND v_now > v_due_at THEN
    RAISE EXCEPTION 'El plazo de entrega de esta actividad ha finalizado';
  END IF;

  -- Defensa en profundidad para score mínimo y máximo
  IF p_score < v_min_score OR p_score > v_max_score THEN
    RAISE EXCEPTION 'Calificación oficial fuera del rango permitido [%, %]', v_min_score, v_max_score;
  END IF;

  -- Calcular automáticamente el siguiente número de intento en servidor
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_attempt_number
  FROM public.activity_attempts
  WHERE activity_id = p_activity_id AND student_id = p_student_id;

  -- Registrar nuevo intento individual real
  INSERT INTO public.activity_attempts (
    activity_id,
    student_id,
    submission_id,
    attempt_number,
    score,
    submission_data,
    completed_at
  ) VALUES (
    p_activity_id,
    p_student_id,
    p_submission_id,
    v_next_attempt_number,
    p_score,
    p_submission_data,
    v_now
  );

  -- Insertar o actualizar resumen de mejor nota atómicamente
  SELECT * INTO v_existing_results
  FROM public.activity_results
  WHERE activity_id = p_activity_id AND student_id = p_student_id;

  IF v_existing_results.id IS NULL THEN
    INSERT INTO public.activity_results (
      activity_id,
      student_id,
      best_score,
      attempt_count,
      result_status,
      result_source,
      first_completed_at,
      last_completed_at
    ) VALUES (
      p_activity_id,
      p_student_id,
      p_score,
      1,
      'completed',
      'student_submission',
      v_now,
      v_now
    );
  ELSE
    UPDATE public.activity_results
    SET
      best_score = GREATEST(COALESCE(v_existing_results.best_score, 0), p_score),
      attempt_count = COALESCE(v_existing_results.attempt_count, 0) + 1,
      result_status = 'completed',
      result_source = 'student_submission',
      first_completed_at = COALESCE(v_existing_results.first_completed_at, v_now),
      last_completed_at = v_now
    WHERE id = v_existing_results.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_retry', false,
    'activity_id', p_activity_id,
    'student_id', p_student_id,
    'submission_id', p_submission_id,
    'attempt_number', v_next_attempt_number,
    'score', p_score,
    'max_score', v_max_score,
    'best_score', GREATEST(COALESCE(v_existing_results.best_score, 0), p_score),
    'attempt_count', COALESCE(v_existing_results.attempt_count, 0) + 1,
    'registered_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.record_activity_attempt(uuid, uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;

-- 7. Crear Gateway RPC Público con firma de submission_id (Solo service_role)
CREATE OR REPLACE FUNCTION public.record_activity_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_submission_id uuid,
  p_score numeric,
  p_submission_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.record_activity_attempt(p_activity_id, p_student_id, p_submission_id, p_score, p_submission_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, uuid, numeric, jsonb) TO service_role;
