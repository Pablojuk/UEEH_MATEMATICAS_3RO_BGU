-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Política de Intentos Diferenciada (Gamificación Ilimitada vs Classwork Limitado)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna opcional attempt_policy a public.activities
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS attempt_policy text 
CHECK (attempt_policy IS NULL OR attempt_policy IN ('classwork_limited', 'gamification_unlimited'));

COMMENT ON COLUMN public.activities.attempt_policy IS 'Política de intentos: classwork_limited (máx 4 intentos con escala 10/9/8/7 y 1 al 4to fallo) o gamification_unlimited (intentos ilimitados con escala 10/9/8/7 sin bloqueo hasta acertar). Si es NULL, se infiere según activity_type.';

-- 2. Actualizar private.record_exercise_check para aplicar la política correspondiente
CREATE OR REPLACE FUNCTION private.record_exercise_check(
    p_activity_id uuid,
    p_student_id uuid,
    p_exercise_key text,
    p_check_id uuid,
    p_is_correct boolean,
    p_answer_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_run_id uuid;
    v_existing_check record;
    v_existing_prog record;
    v_attempt_count integer := 0;
    v_next_attempt integer;
    v_status text;
    v_score numeric(4,2) := NULL;
    v_locked boolean := false;
    v_remaining integer := NULL;
    v_response jsonb;
    v_activity_type text;
    v_attempt_policy text;
    v_effective_policy text;
BEGIN
    -- 1. Obtener bloqueo transaccional por actividad, estudiante y ejercicio
    PERFORM pg_advisory_xact_lock(
        hashtext(p_activity_id::text),
        hashtext(p_student_id::text || ':' || p_exercise_key)
    );

    -- 2. Resolver o inicializar la sesión activa (activity_run) oficial
    v_run_id := private.get_or_create_active_run(p_activity_id, p_student_id);

    -- 3. Idempotencia histórica: si este check_id ya fue procesado en este run, retornar el payload exacto
    SELECT * INTO v_existing_check
    FROM public.activity_exercise_checks
    WHERE student_id = p_student_id
      AND activity_id = p_activity_id
      AND activity_run_id = v_run_id
      AND exercise_key = p_exercise_key
      AND check_id = p_check_id
    LIMIT 1;

    IF v_existing_check.id IS NOT NULL THEN
        RETURN v_existing_check.response_payload || jsonb_build_object('idempotent', true);
    END IF;

    -- 4. Obtener tipo de actividad y política de intentos configurada
    SELECT activity_type, attempt_policy 
    INTO v_activity_type, v_attempt_policy
    FROM public.activities
    WHERE id = p_activity_id;

    IF v_activity_type IS NULL THEN
        RAISE EXCEPTION 'Actividad % no encontrada', p_activity_id;
    END IF;

    v_effective_policy := COALESCE(v_attempt_policy,
        CASE WHEN v_activity_type = 'gamification' THEN 'gamification_unlimited'
             ELSE 'classwork_limited'
        END
    );

    -- 5. Consultar estado consolidado actual del ejercicio
    SELECT * INTO v_existing_prog
    FROM public.activity_exercise_progress
    WHERE student_id = p_student_id
      AND activity_id = p_activity_id
      AND activity_run_id = v_run_id
      AND exercise_key = p_exercise_key
    LIMIT 1;

    IF v_existing_prog.id IS NOT NULL THEN
        v_attempt_count := COALESCE(v_existing_prog.attempt_count, 0);

        -- Validación de bloqueo según política
        IF v_effective_policy = 'gamification_unlimited' THEN
            -- En gamificación, solo se bloquea si ya está correcto
            IF v_existing_prog.locked OR v_existing_prog.status = 'correct' THEN
                v_response := jsonb_build_object(
                    'success', true,
                    'activity_id', p_activity_id,
                    'activity_run_id', v_run_id,
                    'exercise_key', p_exercise_key,
                    'attempt_count', v_attempt_count,
                    'correct', true,
                    'status', 'correct',
                    'score', v_existing_prog.exercise_score,
                    'locked', true,
                    'remaining_attempts', NULL,
                    'attempts_remaining', NULL,
                    'max_attempts_reached', false
                );
                RETURN v_response;
            END IF;
        ELSE
            -- En classwork, se bloquea si locked = true, attempt_count >= 4, correct o failed
            IF v_existing_prog.locked OR v_attempt_count >= 4 OR v_existing_prog.status IN ('correct', 'failed') THEN
                v_response := jsonb_build_object(
                    'success', true,
                    'activity_id', p_activity_id,
                    'activity_run_id', v_run_id,
                    'exercise_key', p_exercise_key,
                    'attempt_count', v_attempt_count,
                    'correct', (v_existing_prog.status = 'correct'),
                    'status', v_existing_prog.status,
                    'score', v_existing_prog.exercise_score,
                    'locked', true,
                    'remaining_attempts', 0,
                    'attempts_remaining', 0,
                    'max_attempts_reached', true
                );
                RETURN v_response;
            END IF;
        END IF;
    END IF;

    -- 6. Calcular nuevo número de intento
    v_next_attempt := v_attempt_count + 1;

    -- 7. Aplicar lógica de evaluación según política
    IF v_effective_policy = 'gamification_unlimited' THEN
        -- ═══════════════════════════════════════════════════════════
        -- POLÍTICA GAMIFICACIÓN (Intentos ilimitados, bloqueo solo al acertar)
        -- ═══════════════════════════════════════════════════════════
        IF p_is_correct THEN
            v_status := 'correct';
            v_locked := true;
            v_remaining := NULL;
            IF v_next_attempt = 1 THEN
                v_score := 10.00;
            ELSIF v_next_attempt = 2 THEN
                v_score := 9.00;
            ELSIF v_next_attempt = 3 THEN
                v_score := 8.00;
            ELSE
                v_score := 7.00; -- Intento 4 o superior (5, 10, 20...)
            END IF;
        ELSE
            v_status := 'incorrect';
            v_locked := false;
            v_score := NULL;
            v_remaining := NULL;
        END IF;
    ELSE
        -- ═══════════════════════════════════════════════════════════
        -- POLÍTICA CLASSWORK (Máximo 4 intentos, 1/10 al 4to fallo)
        -- ═══════════════════════════════════════════════════════════
        IF p_is_correct THEN
            v_status := 'correct';
            v_locked := true;
            v_remaining := 0;
            IF v_next_attempt = 1 THEN
                v_score := 10.00;
            ELSIF v_next_attempt = 2 THEN
                v_score := 9.00;
            ELSIF v_next_attempt = 3 THEN
                v_score := 8.00;
            ELSE
                v_score := 7.00;
            END IF;
        ELSE
            IF v_next_attempt >= 4 THEN
                v_status := 'failed';
                v_locked := true;
                v_score := 1.00; -- Nunca 0.00
                v_remaining := 0;
            ELSE
                v_status := 'incorrect';
                v_locked := false;
                v_score := NULL;
                v_remaining := 4 - v_next_attempt;
            END IF;
        END IF;
    END IF;

    -- 8. Construir respuesta oficial
    v_response := jsonb_build_object(
        'success', true,
        'activity_id', p_activity_id,
        'activity_run_id', v_run_id,
        'exercise_key', p_exercise_key,
        'attempt_count', v_next_attempt,
        'correct', p_is_correct,
        'status', v_status,
        'score', v_score,
        'locked', v_locked,
        'remaining_attempts', v_remaining,
        'attempts_remaining', v_remaining
    );

    -- 9. Registrar en historial inmutable de comprobaciones
    INSERT INTO public.activity_exercise_checks (
        student_id,
        activity_id,
        activity_run_id,
        exercise_key,
        check_id,
        attempt_number,
        answer_data,
        is_correct,
        score,
        response_payload,
        created_at
    ) VALUES (
        p_student_id,
        p_activity_id,
        v_run_id,
        p_exercise_key,
        p_check_id,
        v_next_attempt,
        COALESCE(p_answer_data, '{}'::jsonb),
        p_is_correct,
        v_score,
        v_response,
        now()
    );

    -- 10. Actualizar estado consolidado en public.activity_exercise_progress
    INSERT INTO public.activity_exercise_progress (
        student_id,
        activity_id,
        activity_run_id,
        exercise_key,
        answer_data,
        attempt_count,
        exercise_score,
        status,
        locked,
        last_checked_at,
        updated_at
    ) VALUES (
        p_student_id,
        p_activity_id,
        v_run_id,
        p_exercise_key,
        COALESCE(p_answer_data, '{}'::jsonb),
        v_next_attempt,
        v_score,
        v_status,
        v_locked,
        now(),
        now()
    )
    ON CONFLICT (student_id, activity_id, activity_run_id, exercise_key)
    DO UPDATE SET
        answer_data = EXCLUDED.answer_data,
        attempt_count = EXCLUDED.attempt_count,
        exercise_score = EXCLUDED.exercise_score,
        status = EXCLUDED.status,
        locked = EXCLUDED.locked,
        last_checked_at = EXCLUDED.last_checked_at,
        updated_at = EXCLUDED.updated_at;

    RETURN v_response;
END;
$$;
