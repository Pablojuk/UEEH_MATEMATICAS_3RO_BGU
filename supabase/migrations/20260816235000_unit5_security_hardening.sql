-- ============================================================================
-- MIGRACIÓN INCREMENTAL DE HARDENING DE SEGURIDAD: UNIDAD 5+
-- UEEH MATEMÁTICAS 3.º BGU (FIJADO DE SEARCH_PATH Y CONTROL ESTRICTO DE PERMISOS)
-- ============================================================================

-- 1. Fijar search_path y refactorizar schema-qualification en funciones privadas
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION private.current_student_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM public.students
    WHERE linked_user_id = auth.uid() AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION private.check_activity_section_term_consistency()
RETURNS trigger AS $$
DECLARE
  v_section_year_id uuid;
  v_term_year_id uuid;
BEGIN
  SELECT academic_year_id INTO v_section_year_id FROM public.class_sections WHERE id = NEW.class_section_id;
  SELECT academic_year_id INTO v_term_year_id FROM public.academic_terms WHERE id = NEW.academic_term_id;

  IF v_section_year_id IS NULL OR v_term_year_id IS NULL THEN
    RAISE EXCEPTION 'Sección de clase o periodo académico inexistente';
  END IF;

  IF v_section_year_id <> v_term_year_id THEN
    RAISE EXCEPTION 'Inconsistencia académica: La sección de clase y el periodo pertenecen a años lectivos diferentes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.get_activity_grading_config(p_activity_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT activity_id, grader_type, config
  INTO v_rec
  FROM private.activity_grading_configs
  WHERE activity_id = p_activity_id;

  IF v_rec.activity_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'activity_id', v_rec.activity_id,
    'grader_type', v_rec.grader_type,
    'config', v_rec.config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.record_activity_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_score numeric,
  p_submission_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_max_score numeric(5,2);
  v_next_attempt_number integer;
  v_existing_results RECORD;
BEGIN
  -- Concurrencia segura: Lock determinista por estudiante y actividad
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text));

  -- Consultar score máximo permitido
  SELECT max_score INTO v_max_score FROM public.activities WHERE id = p_activity_id AND is_active = true;
  IF v_max_score IS NULL THEN
    RAISE EXCEPTION 'Actividad inactiva o inexistente';
  END IF;

  -- Defensa en profundidad para score
  IF p_score < 0 OR p_score > v_max_score THEN
    RAISE EXCEPTION 'Calificación fuera del rango permitido [0, %]', v_max_score;
  END IF;

  -- Calcular automáticamente el siguiente número de intento en servidor
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_attempt_number
  FROM public.activity_attempts
  WHERE activity_id = p_activity_id AND student_id = p_student_id;

  -- Registrar intento individual
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
    now()
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
      first_completed_at,
      last_completed_at
    ) VALUES (
      p_activity_id,
      p_student_id,
      p_score,
      1,
      now(),
      now()
    );
  ELSE
    UPDATE public.activity_results
    SET
      best_score = GREATEST(v_existing_results.best_score, p_score),
      attempt_count = v_existing_results.attempt_count + 1,
      last_completed_at = now()
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

-- 2. Refactorizar Wrappers Públicos con search_path Fijo
CREATE OR REPLACE FUNCTION public.get_activity_grading_config(p_activity_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN private.get_activity_grading_config(p_activity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.record_activity_attempt(
  p_activity_id uuid,
  p_student_id uuid,
  p_score numeric,
  p_submission_data jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.record_activity_attempt(p_activity_id, p_student_id, p_score, p_submission_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Revocar Permisos Directos en Funciones Privadas Exclusivas de Servidor
REVOKE EXECUTE ON FUNCTION private.get_activity_grading_config(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.record_activity_attempt(uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.check_activity_section_term_consistency() FROM PUBLIC, anon, authenticated, service_role;

-- 4. Asegurar Permisos Únicos para service_role en Wrappers Públicos Gateway
REVOKE EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, numeric, jsonb) TO service_role;
