-- ============================================================================
-- MIGRACIÓN INCREMENTAL: PLAZOS DE ENTREGA Y NOTA MÍNIMA OFICIAL (UNIDAD 5+)
-- UEEH MATEMÁTICAS 3.º BGU (SEGUNDO TRIMESTRE EN ADELANTE)
-- ============================================================================

-- 1. Extender public.activities con fechas de apertura, cierre y nota mínima
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS minimum_score numeric(5,2) NOT NULL DEFAULT 1.00;

-- Restricciones para minimum_score y coherencia entre opens_at y due_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'activities' AND constraint_name = 'chk_activities_minimum_score'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT chk_activities_minimum_score CHECK (minimum_score > 0 AND minimum_score <= max_score);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.check_activity_dates_consistency()
RETURNS trigger AS $$
BEGIN
  IF NEW.opens_at IS NOT NULL AND NEW.due_at IS NOT NULL THEN
    IF NEW.due_at <= NEW.opens_at THEN
      RAISE EXCEPTION 'La fecha de cierre (due_at) debe ser posterior a la fecha de apertura (opens_at)';
    END IF;
  END IF;

  IF NEW.minimum_score > NEW.max_score OR NEW.minimum_score <= 0 THEN
    RAISE EXCEPTION 'La nota mínima debe estar en el rango (0, max_score]';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_check_activity_dates ON public.activities;
CREATE TRIGGER trg_check_activity_dates
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION private.check_activity_dates_consistency();

-- 2. Adaptar public.activity_results para soportar NO ENTREGA
ALTER TABLE public.activity_results
  ADD COLUMN IF NOT EXISTS result_status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS result_source text NOT NULL DEFAULT 'student_submission';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'activity_results' AND constraint_name = 'chk_activity_results_status'
  ) THEN
    ALTER TABLE public.activity_results
      ADD CONSTRAINT chk_activity_results_status CHECK (result_status IN ('completed', 'not_submitted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'activity_results' AND constraint_name = 'chk_activity_results_source'
  ) THEN
    ALTER TABLE public.activity_results
      ADD CONSTRAINT chk_activity_results_source CHECK (result_source IN ('student_submission', 'deadline_auto'));
  END IF;
END $$;

-- Permitir attempt_count >= 0 y fechas NULL en activity_results cuando no hay entrega
ALTER TABLE public.activity_results DROP CONSTRAINT IF EXISTS activity_results_attempt_count_check;
ALTER TABLE public.activity_results ADD CONSTRAINT activity_results_attempt_count_check CHECK (attempt_count >= 0);

ALTER TABLE public.activity_results ALTER COLUMN first_completed_at DROP NOT NULL;
ALTER TABLE public.activity_results ALTER COLUMN last_completed_at DROP NOT NULL;

-- 3. Actualizar private.record_activity_attempt con validación de plazo y nota mínima
CREATE OR REPLACE FUNCTION private.record_activity_attempt(
  p_activity_id uuid,
  p_student_id uuid,
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
  v_existing_results RECORD;
  v_now timestamptz := now();
BEGIN
  -- Concurrencia segura: Lock determinista por estudiante y actividad
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text));

  -- Consultar estado y ventana de tiempo de la actividad
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

  -- Registrar intento individual real
  INSERT INTO public.activity_attempts (
    activity_id,
    student_id,
    attempt_number,
    score,
    submission_data,
    completed_at
  ) VALUES (
    p_activity_id,
    p_student_id,
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
    'activity_id', p_activity_id,
    'student_id', p_student_id,
    'attempt_number', v_next_attempt_number,
    'score', p_score,
    'max_score', v_max_score,
    'best_score', GREATEST(COALESCE(v_existing_results.best_score, 0), p_score),
    'attempt_count', COALESCE(v_existing_results.attempt_count, 0) + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Función Idempotente de Cierre de Actividades Vencidas (Sin Intento Falso)
CREATE OR REPLACE FUNCTION private.finalize_overdue_activities()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_rec RECORD;
BEGIN
  -- Buscar actividades vencidas activas y estudiantes matriculados activos sin entrega
  FOR v_rec IN
    SELECT 
      a.id AS activity_id,
      s.id AS student_id,
      a.minimum_score
    FROM public.activities a
    JOIN public.enrollments e ON e.class_section_id = a.class_section_id AND e.status = 'active'
    JOIN public.students s ON s.id = e.student_id AND s.status = 'active'
    WHERE a.is_active = true
      AND a.due_at IS NOT NULL
      AND a.due_at < now()
      AND e.enrolled_at <= a.due_at
      AND NOT EXISTS (
        SELECT 1 FROM public.activity_results ar
        WHERE ar.activity_id = a.id
          AND ar.student_id = s.id
          AND ar.result_status = 'completed'
      )
  LOOP
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
      v_rec.activity_id,
      v_rec.student_id,
      v_rec.minimum_score,
      0,
      'not_submitted',
      'deadline_auto',
      NULL,
      NULL
    )
    ON CONFLICT (activity_id, student_id) DO UPDATE
    SET
      best_score = v_rec.minimum_score,
      result_status = 'not_submitted',
      result_source = 'deadline_auto'
    WHERE public.activity_results.result_status <> 'completed';

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Revocar permisos de la función privada de cierre automático
REVOKE EXECUTE ON FUNCTION private.finalize_overdue_activities() FROM PUBLIC, anon, authenticated, service_role;

-- 5. Habilitar pg_cron y Programar Job Recurrente cada 5 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ueeh-finalize-overdue-activities')
    FROM cron.job
    WHERE jobname = 'ueeh-finalize-overdue-activities';

    PERFORM cron.schedule(
      'ueeh-finalize-overdue-activities',
      '*/5 * * * *',
      'SELECT private.finalize_overdue_activities()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron no disponible o sin superusuario: %', SQLERRM;
END $$;
