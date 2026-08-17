-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: UNIDAD 5 - PREGUNTAS Y INTENTOS SERVER-SIDE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS private.activity_question_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    run_id uuid NOT NULL,
    phase text NOT NULL DEFAULT 'initial',
    question_id text NOT NULL,
    attempt_number integer NOT NULL CHECK (attempt_number >= 1),
    answer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_correct boolean NOT NULL,
    partial_fraction numeric(4, 3) NULL,
    question_score numeric(5, 2) NOT NULL DEFAULT 0.00,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_activity_question_attempts_lookup
  ON private.activity_question_attempts (activity_id, student_id, run_id, phase, question_id);

-- Restricción de seguridad: esquema private fuera del Data API
REVOKE ALL ON private.activity_question_attempts FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Función privada para registrar intento de pregunta server-side
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.record_question_attempt(
    p_activity_id uuid,
    p_student_id uuid,
    p_run_id uuid,
    p_phase text,
    p_question_id text,
    p_answer_data jsonb,
    p_is_correct boolean,
    p_partial_fraction numeric,
    p_question_score numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_next_attempt_number integer;
    v_inserted_id uuid;
    v_locked boolean;
    v_remaining integer;
BEGIN
    -- Determinar el siguiente attempt_number para esta pregunta en esta fase y ejecución
    SELECT COALESCE(MAX(attempt_number), 0) + 1
      INTO v_next_attempt_number
      FROM private.activity_question_attempts
     WHERE activity_id = p_activity_id
       AND student_id = p_student_id
       AND run_id = p_run_id
       AND phase = p_phase
       AND question_id = p_question_id;

    -- Si ya se alcanzaron 3 intentos o ya estaba correcta, bloquear
    IF v_next_attempt_number > 3 THEN
        RAISE EXCEPTION 'Límite de intentos para esta pregunta alcanzado.';
    END IF;

    INSERT INTO private.activity_question_attempts (
        activity_id,
        student_id,
        run_id,
        phase,
        question_id,
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
        v_next_attempt_number,
        p_answer_data,
        p_is_correct,
        p_partial_fraction,
        p_question_score
    )
    RETURNING id INTO v_inserted_id;

    v_locked := p_is_correct OR v_next_attempt_number >= 3;
    v_remaining := GREATEST(0, 3 - v_next_attempt_number);

    RETURN jsonb_build_object(
        'attempt_id', v_inserted_id,
        'attempt_number', v_next_attempt_number,
        'is_correct', p_is_correct,
        'question_score', p_question_score,
        'attempts_remaining', v_remaining,
        'locked', v_locked
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.record_question_attempt(uuid, uuid, uuid, text, text, jsonb, boolean, numeric, numeric) FROM PUBLIC, anon, authenticated;
