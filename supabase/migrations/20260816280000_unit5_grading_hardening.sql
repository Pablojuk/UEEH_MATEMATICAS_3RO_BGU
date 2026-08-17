-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: HARDENING COMPLETO DE CALIFICACIÓN Y DE RUTAS (UNIDAD 5)
-- UEEH MATEMÁTICAS 3.º BGU
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Asegurar columna question_submission_id y restricciones de idempotencia en private.activity_question_attempts
ALTER TABLE private.activity_question_attempts
  ADD COLUMN IF NOT EXISTS question_submission_id uuid NOT NULL DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'private' AND table_name = 'activity_question_attempts' AND constraint_name = 'chk_question_attempts_submission_unique'
  ) THEN
    ALTER TABLE private.activity_question_attempts
      ADD CONSTRAINT chk_question_attempts_submission_unique UNIQUE (activity_id, student_id, question_submission_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'private' AND table_name = 'activity_question_attempts' AND constraint_name = 'chk_question_attempts_run_phase_q_attempt_unique'
  ) THEN
    ALTER TABLE private.activity_question_attempts
      ADD CONSTRAINT chk_question_attempts_run_phase_q_attempt_unique UNIQUE (activity_id, student_id, run_id, phase, question_id, attempt_number);
  END IF;
END $$;

-- 2. Función Core Privada: private.record_question_attempt
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
  v_existing RECORD;
  v_prev_correct RECORD;
  v_attempt_count integer;
  v_next_attempt integer;
  v_score numeric(5,2) := 0.00;
  v_is_locked boolean := false;
  v_partial numeric(5,2);
BEGIN
  -- Concurrencia segura: Lock determinista por pregunta dentro de la corrida
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':' || p_run_id::text || ':' || p_phase || ':' || p_question_id));

  -- 1. Idempotencia: Verificar si la submission_id ya fue procesada anteriormente
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
      'locked', (v_existing.is_correct OR v_existing.attempt_number >= 3)
    );
  END IF;

  -- 2. Verificar si la pregunta ya fue respondida correctamente en esta fase/run
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

  -- 3. Contar intentos acumulados anteriores
  SELECT COALESCE(MAX(attempt_number), 0) INTO v_attempt_count
  FROM private.activity_question_attempts
  WHERE activity_id = p_activity_id
    AND student_id = p_student_id
    AND run_id = p_run_id
    AND phase = p_phase
    AND question_id = p_question_id;

  IF v_attempt_count >= 3 THEN
    -- Si ya realizó 3 intentos, la pregunta está bloqueada
    SELECT question_score INTO v_score
    FROM private.activity_question_attempts
    WHERE activity_id = p_activity_id
      AND student_id = p_student_id
      AND run_id = p_run_id
      AND phase = p_phase
      AND question_id = p_question_id
      AND attempt_number = 3;

    RETURN jsonb_build_object(
      'success', true,
      'locked', true,
      'max_attempts_reached', true,
      'activity_id', p_activity_id,
      'student_id', p_student_id,
      'run_id', p_run_id,
      'phase', p_phase,
      'question_id', p_question_id,
      'attempt_number', 3,
      'is_correct', false,
      'question_score', COALESCE(v_score, 0.00)
    );
  END IF;

  v_next_attempt := v_attempt_count + 1;

  -- 4. Cálculo oficial de nota server-side según reglas pedagógicas (10 / 9 / 8)
  IF p_is_correct THEN
    v_is_locked := true;
    IF v_next_attempt = 1 THEN
      v_score := 10.00;
    ELSIF v_next_attempt = 2 THEN
      v_score := 9.00;
    ELSE
      v_score := 8.00;
    END IF;
  ELSE
    IF v_next_attempt >= 3 THEN
      v_is_locked := true;
      IF p_partial_fraction IS NOT NULL AND p_partial_fraction > 0 THEN
        v_partial := LEAST(1.00, GREATEST(0.00, p_partial_fraction));
        v_score := ROUND(v_partial * 10.00, 2);
      ELSE
        v_score := 0.00;
      END IF;
    ELSE
      v_is_locked := false;
      v_score := 0.00;
    END IF;
  END IF;

  -- 5. Registrar el intento
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
    'attempts_remaining', (3 - v_next_attempt),
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

-- 4. Gateway RPC Público: public.get_activity_grading_config (service_role ONLY)
CREATE OR REPLACE FUNCTION public.get_activity_grading_config(
  p_activity_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT grader_type, config INTO v_rec
  FROM private.activity_grading_configs
  WHERE activity_id = p_activity_id;

  IF v_rec.grader_type IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'grader_type', v_rec.grader_type,
    'config', v_rec.config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) TO service_role;

-- 5. Gateway RPC Público: public.get_activity_run_summary (service_role ONLY)
CREATE OR REPLACE FUNCTION public.get_activity_run_summary(
  p_activity_id uuid,
  p_student_id uuid,
  p_run_id uuid,
  p_phase text
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id', sub.question_id,
      'terminal_score', sub.max_score,
      'attempt_count', sub.attempts_count,
      'is_correct', sub.has_correct,
      'locked', (sub.has_correct OR sub.attempts_count >= 3)
    )
  ) INTO v_result
  FROM (
    SELECT
      question_id,
      MAX(question_score) AS max_score,
      COUNT(*)::integer AS attempts_count,
      BOOL_OR(is_correct) AS has_correct
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

-- 6. Corrección de Periodo Académico (term_number = 2), Rutas y Desactivación Temporal
DO $$
DECLARE
  v_term2_id uuid;
  v_year_id uuid;
BEGIN
  SELECT academic_year_id INTO v_year_id FROM public.class_sections LIMIT 1;
  IF v_year_id IS NULL THEN
    RAISE EXCEPTION 'No class section found';
  END IF;

  SELECT id INTO v_term2_id FROM public.academic_terms 
  WHERE academic_year_id = v_year_id AND term_number = 2 LIMIT 1;

  IF v_term2_id IS NULL THEN
    INSERT INTO public.academic_terms (academic_year_id, name, term_number, starts_at, ends_at)
    VALUES (v_year_id, 'Segundo Trimestre', 2, '2026-08-16 00:00:00-05', '2026-11-30 23:59:59-05')
    RETURNING id INTO v_term2_id;
  END IF;

  UPDATE public.activities
  SET academic_term_id = v_term2_id,
      source_path = 'topics/unit5-determinantes/gamificacion.html',
      is_active = false
  WHERE activity_key = 'u5-determinantes-gam-01';

  UPDATE public.activities
  SET academic_term_id = v_term2_id,
      source_path = 'topics/unit5-determinantes/deber.html',
      is_active = false
  WHERE activity_key = 'u5-determinantes-class-01';
END $$;
