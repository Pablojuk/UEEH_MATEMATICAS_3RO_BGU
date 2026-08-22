-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: INFRAESTRUCTURA DE GUARDADO AUTOMÁTICO POR EJERCICIO,
-- HISTORIAL INMUTABLE Y GESTIÓN DE EJECUCIONES (UNIDAD 5+)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. TABLA: public.activity_runs (Gestión de Ejecuciones de Actividad)
CREATE TABLE IF NOT EXISTS public.activity_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('in_progress', 'submitted')) DEFAULT 'in_progress',
    submission_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz NULL
);

-- Índice único parcial: Máximo 1 run in_progress por estudiante y actividad
CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_runs_single_active
  ON public.activity_runs (student_id, activity_id)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_activity_runs_lookup
  ON public.activity_runs (student_id, activity_id, status);

CREATE INDEX IF NOT EXISTS idx_activity_runs_submission
  ON public.activity_runs (submission_id)
  WHERE submission_id IS NOT NULL;

-- 2. TABLA: public.activity_exercise_progress (Estado Consolidado del Ejercicio en el Run)
CREATE TABLE IF NOT EXISTS public.activity_exercise_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    activity_run_id uuid NOT NULL REFERENCES public.activity_runs(id) ON DELETE CASCADE,
    exercise_key text NOT NULL,
    answer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0 AND attempt_count <= 4),
    exercise_score numeric(4,2) NULL CHECK (exercise_score IS NULL OR (exercise_score >= 1.00 AND exercise_score <= 10.00)),
    status text NOT NULL CHECK (status IN ('pending', 'incorrect', 'correct', 'failed')) DEFAULT 'pending',
    locked boolean NOT NULL DEFAULT false,
    last_checked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_exercise_progress UNIQUE (student_id, activity_id, activity_run_id, exercise_key)
);

CREATE INDEX IF NOT EXISTS idx_activity_exercise_progress_run
  ON public.activity_exercise_progress (activity_run_id, exercise_key);

CREATE INDEX IF NOT EXISTS idx_activity_exercise_progress_student_act
  ON public.activity_exercise_progress (student_id, activity_id);

-- 3. TABLA: public.activity_exercise_checks (Historial Inmutable de Comprobaciones)
CREATE TABLE IF NOT EXISTS public.activity_exercise_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    activity_run_id uuid NOT NULL REFERENCES public.activity_runs(id) ON DELETE CASCADE,
    exercise_key text NOT NULL,
    check_id uuid NOT NULL,
    attempt_number integer NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 4),
    answer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_correct boolean NOT NULL,
    score numeric(4,2) NULL,
    response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_exercise_checks UNIQUE (student_id, activity_id, activity_run_id, exercise_key, check_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_exercise_checks_lookup
  ON public.activity_exercise_checks (student_id, activity_id, activity_run_id, exercise_key, check_id);

-- 4. SEGURIDAD RLS (Reutilizando helpers existentes private.current_student_id() y private.is_admin())
ALTER TABLE public.activity_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_exercise_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_select_own_runs ON public.activity_runs;
CREATE POLICY student_select_own_runs ON public.activity_runs
  FOR SELECT TO authenticated
  USING (student_id = private.current_student_id() OR private.is_admin());

DROP POLICY IF EXISTS student_select_own_exercise_progress ON public.activity_exercise_progress;
CREATE POLICY student_select_own_exercise_progress ON public.activity_exercise_progress
  FOR SELECT TO authenticated
  USING (student_id = private.current_student_id() OR private.is_admin());

DROP POLICY IF EXISTS student_select_own_exercise_checks ON public.activity_exercise_checks;
CREATE POLICY student_select_own_exercise_checks ON public.activity_exercise_checks
  FOR SELECT TO authenticated
  USING (student_id = private.current_student_id() OR private.is_admin());

-- Revocar permisos directos de inserción/actualización/borrado a clientes
REVOKE INSERT, UPDATE, DELETE ON public.activity_runs FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.activity_exercise_progress FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.activity_exercise_checks FROM PUBLIC, anon, authenticated;

-- 5. FUNCIÓN PRIVADA: private.get_or_create_active_run
CREATE OR REPLACE FUNCTION private.get_or_create_active_run(
    p_activity_id uuid,
    p_student_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_run_id uuid;
BEGIN
    -- Lock determinista para evitar race conditions al crear run
    PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':run'));

    SELECT id INTO v_run_id
    FROM public.activity_runs
    WHERE activity_id = p_activity_id
      AND student_id = p_student_id
      AND status = 'in_progress'
    LIMIT 1;

    IF v_run_id IS NULL THEN
        INSERT INTO public.activity_runs (activity_id, student_id, status)
        VALUES (p_activity_id, p_student_id, 'in_progress')
        RETURNING id INTO v_run_id;
    END IF;

    RETURN v_run_id;
END;
$$;

-- 6. FUNCIÓN PRIVADA: private.record_exercise_check
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
    v_existing_check RECORD;
    v_existing_prog RECORD;
    v_attempt_count integer := 0;
    v_next_attempt integer := 1;
    v_status text;
    v_score numeric(4,2) := NULL;
    v_locked boolean := false;
    v_remaining integer := 0;
    v_response jsonb;
BEGIN
    -- 1. Resolver el run activo oficial del estudiante
    v_run_id := private.get_or_create_active_run(p_activity_id, p_student_id);

    -- 2. Lock determinista por ejercicio en el run
    PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':' || v_run_id::text || ':' || p_exercise_key));

    -- 3. Idempotencia histórica: verificar si este check_id ya fue procesado
    SELECT * INTO v_existing_check
    FROM public.activity_exercise_checks
    WHERE activity_id = p_activity_id
      AND student_id = p_student_id
      AND activity_run_id = v_run_id
      AND exercise_key = p_exercise_key
      AND check_id = p_check_id;

    IF v_existing_check.id IS NOT NULL THEN
        RETURN v_existing_check.response_payload;
    END IF;

    -- 4. Consultar estado consolidado actual del ejercicio
    SELECT * INTO v_existing_prog
    FROM public.activity_exercise_progress
    WHERE activity_id = p_activity_id
      AND student_id = p_student_id
      AND activity_run_id = v_run_id
      AND exercise_key = p_exercise_key;

    IF v_existing_prog.id IS NOT NULL THEN
        v_attempt_count := v_existing_prog.attempt_count;

        -- Si el ejercicio ya está bloqueado (acertado o fallido) o ya consumió 4 intentos:
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

    -- 5. Calcular nuevo intento
    v_next_attempt := v_attempt_count + 1;

    -- 6. Aplicar escala pedagógica inmutable
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

    -- 7. Construir respuesta oficial
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

    -- 8. Registrar en historial inmutable de comprobaciones
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

    -- 9. Actualizar estado consolidado en public.activity_exercise_progress
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

-- 7. GATEWAY RPC: public.record_exercise_check (service_role ONLY)
CREATE OR REPLACE FUNCTION public.record_exercise_check(
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
BEGIN
    RETURN private.record_exercise_check(
        p_activity_id,
        p_student_id,
        p_exercise_key,
        p_check_id,
        p_is_correct,
        p_answer_data
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_exercise_check(uuid, uuid, text, uuid, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_exercise_check(uuid, uuid, text, uuid, boolean, jsonb) TO service_role;

-- 8. FUNCIÓN DE CONSULTA: public.get_student_exercise_progress
CREATE OR REPLACE FUNCTION public.get_student_exercise_progress(
    p_activity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_student_id uuid;
    v_run_id uuid;
    v_result jsonb;
BEGIN
    v_student_id := private.current_student_id();
    IF v_student_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT id INTO v_run_id
    FROM public.activity_runs
    WHERE activity_id = p_activity_id
      AND student_id = v_student_id
      AND status = 'in_progress'
    LIMIT 1;

    IF v_run_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'exercise_key', exercise_key,
            'answer_data', answer_data,
            'attempt_count', attempt_count,
            'exercise_score', exercise_score,
            'status', status,
            'locked', locked,
            'last_checked_at', last_checked_at
        )
    ) INTO v_result
    FROM public.activity_exercise_progress
    WHERE activity_run_id = v_run_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_exercise_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_exercise_progress(uuid) TO authenticated, service_role;
