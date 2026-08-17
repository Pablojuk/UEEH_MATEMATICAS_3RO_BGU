-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: REGLAS DE CALIFICACIÓN INMUTABLES UNIDAD 5+
-- UEEH MATEMÁTICAS 3.º BGU
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Eliminar sobrecargas legacy de record_question_attempt si existieran
DROP FUNCTION IF EXISTS public.record_question_attempt(uuid, uuid, uuid, text, text, boolean, numeric);
DROP FUNCTION IF EXISTS private.record_question_attempt(uuid, uuid, uuid, text, text, boolean, numeric);

-- 2. Función Core Privada Actualizada: private.record_question_attempt
CREATE OR REPLACE FUNCTION private.record_question_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_run_id uuid,
  p_phase text,
  p_question_id text,
  p_question_submission_id uuid,
  p_is_correct boolean,
  p_partial_fraction numeric DEFAULT NULL,
  p_answer_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_activity_type text;
  v_existing RECORD;
  v_prev_correct RECORD;
  v_attempt_count integer;
  v_next_attempt integer;
  v_score numeric(5,2) := 0.00;
  v_is_locked boolean := false;
  v_attempts_remaining integer := NULL;
BEGIN
  -- Obtener el tipo de actividad desde public.activities
  SELECT activity_type INTO v_activity_type
  FROM public.activities
  WHERE id = p_activity_id;

  IF v_activity_type IS NULL THEN
    RAISE EXCEPTION 'Actividad no encontrada o sin tipo especificado';
  END IF;

  -- Lock de concurrencia determinista por pregunta en la ejecución
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':' || p_run_id::text || ':' || p_phase || ':' || p_question_id));

  -- 1. Idempotencia: Si el question_submission_id ya fue procesado, retornar respuesta idéntica
  SELECT * INTO v_existing
  FROM private.activity_question_attempts
  WHERE activity_id = p_activity_id
    AND student_id = p_student_id
    AND question_submission_id = p_question_submission_id;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'activity_id', p_activity_id,
      'student_id', p_student_id,
      'run_id', p_run_id,
      'phase', p_phase,
      'question_id', p_question_id,
      'attempt_number', v_existing.attempt_number,
      'is_correct', v_existing.is_correct,
      'question_score', v_existing.question_score,
      'locked', (v_existing.is_correct OR (v_activity_type = 'classwork' AND v_existing.attempt_number >= 4))
    );
  END IF;

  -- 2. Verificar si la pregunta ya fue respondida correctamente en este run/phase
  SELECT * INTO v_prev_correct
  FROM private.activity_question_attempts
  WHERE activity_id = p_activity_id
    AND student_id = p_student_id
    AND run_id = p_run_id
    AND phase = p_phase
    AND question_id = p_question_id
    AND is_correct = true
  ORDER BY attempt_number ASC
  LIMIT 1;

  IF v_prev_correct.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'locked', true,
      'already_correct', true,
      'activity_id', p_activity_id,
      'student_id', p_student_id,
      'run_id', p_run_id,
      'phase', p_phase,
      'question_id', p_question_id,
      'attempt_number', v_prev_correct.attempt_number,
      'is_correct', true,
      'question_score', v_prev_correct.question_score
    );
  END IF;

  -- 3. Contar intentos acumulados
  SELECT COALESCE(MAX(attempt_number), 0) INTO v_attempt_count
  FROM private.activity_question_attempts
  WHERE activity_id = p_activity_id
    AND student_id = p_student_id
    AND run_id = p_run_id
    AND phase = p_phase
    AND question_id = p_question_id;

  -- 4. Aplicar política según tipo de actividad
  IF v_activity_type = 'gamification' THEN
    -- GAMIFICACIÓN: Intentos ILIMITADOS. Escala: Intento 1->10, 2->9, 3->8, >=4->7
    v_next_attempt := v_attempt_count + 1;
    v_attempts_remaining := NULL;

    IF p_is_correct THEN
      v_is_locked := true;
      IF v_next_attempt = 1 THEN
        v_score := 10.00;
      ELSIF v_next_attempt = 2 THEN
        v_score := 9.00;
      ELSIF v_next_attempt = 3 THEN
        v_score := 8.00;
      ELSE
        v_score := 7.00; -- Intento 4, 5, 6, ..., N es SIEMPRE 7.00
      END IF;
    ELSE
      v_is_locked := false;
      v_score := 0.00;
    END IF;

  ELSE
    -- TRABAJO EN CLASE / RECUPERACIÓN (classwork): MÁXIMO 4 INTENTOS.
    IF v_attempt_count >= 4 THEN
      SELECT question_score INTO v_score
      FROM private.activity_question_attempts
      WHERE activity_id = p_activity_id
        AND student_id = p_student_id
        AND run_id = p_run_id
        AND phase = p_phase
        AND question_id = p_question_id
        AND attempt_number = 4;

      RETURN jsonb_build_object(
        'success', true,
        'locked', true,
        'max_attempts_reached', true,
        'activity_id', p_activity_id,
        'student_id', p_student_id,
        'run_id', p_run_id,
        'phase', p_phase,
        'question_id', p_question_id,
        'attempt_number', 4,
        'attempts_remaining', 0,
        'is_correct', false,
        'question_score', COALESCE(v_score, 1.00)
      );
    END IF;

    v_next_attempt := v_attempt_count + 1;
    v_attempts_remaining := 4 - v_next_attempt;

    IF p_is_correct THEN
      v_is_locked := true;
      IF v_next_attempt = 1 THEN
        v_score := 10.00;
      ELSIF v_next_attempt = 2 THEN
        v_score := 9.00;
      ELSIF v_next_attempt = 3 THEN
        v_score := 8.00;
      ELSE
        v_score := 7.00; -- Intento 4 correcto = 7.00
      END IF;
    ELSE
      IF v_next_attempt = 4 THEN
        -- CUARTO INTENTO FALLIDO -> Bloquear inmediatamente con 1.00 / 10
        v_is_locked := true;
        v_score := 1.00;
      ELSE
        v_is_locked := false;
        v_score := 0.00;
      END IF;
    END IF;
  END IF;

  -- 5. Registrar el intento en private.activity_question_attempts
  INSERT INTO private.activity_question_attempts (
    activity_id,
    student_id,
    run_id,
    phase,
    question_id,
    question_submission_id,
    attempt_number,
    answer_data,
    is_correct,
    partial_fraction,
    question_score
  ) VALUES (
    p_activity_id,
    p_student_id,
    p_run_id,
    p_phase,
    p_question_id,
    p_question_submission_id,
    v_next_attempt,
    p_answer_data,
    p_is_correct,
    p_partial_fraction,
    v_score
  );

  RETURN jsonb_build_object(
    'success', true,
    'activity_id', p_activity_id,
    'student_id', p_student_id,
    'run_id', p_run_id,
    'phase', p_phase,
    'question_id', p_question_id,
    'attempt_number', v_next_attempt,
    'attempts_remaining', v_attempts_remaining,
    'is_correct', p_is_correct,
    'question_score', v_score,
    'locked', v_is_locked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.record_question_attempt(uuid, uuid, uuid, text, text, uuid, boolean, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;

-- 3. Gateway RPC Público: public.record_question_attempt (service_role ONLY)
CREATE OR REPLACE FUNCTION public.record_question_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_run_id uuid,
  p_phase text,
  p_question_id text,
  p_question_submission_id uuid,
  p_is_correct boolean,
  p_partial_fraction numeric DEFAULT NULL,
  p_answer_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.record_question_attempt(
    p_activity_id,
    p_student_id,
    p_run_id,
    p_phase,
    p_question_id,
    p_question_submission_id,
    p_is_correct,
    p_partial_fraction,
    p_answer_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.record_question_attempt(uuid, uuid, uuid, text, text, uuid, boolean, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_question_attempt(uuid, uuid, uuid, text, text, uuid, boolean, numeric, jsonb) TO service_role;

-- 4. Gateway RPC Público: public.get_activity_run_summary (service_role ONLY)
CREATE OR REPLACE FUNCTION public.get_activity_run_summary(
  p_activity_id uuid,
  p_student_id uuid,
  p_run_id uuid,
  p_phase text
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_activity_type text;
BEGIN
  SELECT activity_type INTO v_activity_type
  FROM public.activities
  WHERE id = p_activity_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id', sub.question_id,
      'terminal_score', sub.terminal_score,
      'attempt_count', sub.attempts_count,
      'is_correct', sub.has_correct,
      'locked', sub.is_locked
    )
  ) INTO v_result
  FROM (
    SELECT
      question_id,
      COALESCE(
        MAX(CASE WHEN is_correct THEN question_score END),
        MAX(CASE WHEN attempt_number >= 4 THEN question_score END),
        0.00
      ) AS terminal_score,
      COUNT(*)::integer AS attempts_count,
      BOOL_OR(is_correct) AS has_correct,
      BOOL_OR(is_correct OR (v_activity_type = 'classwork' AND attempt_number >= 4)) AS is_locked
    FROM private.activity_question_attempts
    WHERE activity_id = p_activity_id
      AND student_id = p_student_id
      AND run_id = p_run_id
      AND phase = p_phase
    GROUP BY question_id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_activity_run_summary(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_run_summary(uuid, uuid, uuid, text) TO service_role;
