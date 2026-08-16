-- ============================================================================
-- MIGRACIÓN INCREMENTAL: GESTIÓN ADMINISTRATIVA DE ACTIVIDADES Y GRADEBOOK
-- UEEH MATEMÁTICAS 3.º BGU (SEGUNDO TRIMESTRE EN ADELANTE)
-- ============================================================================

-- 1. Función Privada y RPC Gateway para Crear / Editar Actividad
CREATE OR REPLACE FUNCTION private.admin_upsert_activity(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_activity_key text,
  p_title text,
  p_activity_type text,
  p_class_section_id uuid,
  p_academic_term_id uuid,
  p_unit_number smallint,
  p_max_score numeric,
  p_minimum_score numeric,
  p_source_path text,
  p_display_order integer,
  p_is_active boolean,
  p_opens_at timestamptz,
  p_due_at timestamptz,
  p_grader_type text,
  p_grading_config jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_section_year_id uuid;
  v_term_year_id uuid;
  v_target_activity_id uuid := p_activity_id;
  v_has_history boolean := false;
  v_existing RECORD;
BEGIN
  -- 1. Validar actor admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos administrativos';
  END IF;

  -- 2. Validaciones básicas de entrada
  IF p_activity_key IS NULL OR length(trim(p_activity_key)) = 0 THEN
    RAISE EXCEPTION 'La clave de la actividad (activity_key) es requerida';
  END IF;

  IF p_activity_key !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'La clave de la actividad solo debe contener letras minúsculas, números y guiones';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'El título de la actividad es requerido';
  END IF;

  IF p_activity_type NOT IN ('gamification', 'classwork') THEN
    RAISE EXCEPTION 'Tipo de actividad inválido (permitidos: gamification, classwork)';
  END IF;

  IF p_unit_number < 5 THEN
    RAISE EXCEPTION 'El número de unidad debe ser >= 5 para la nueva arquitectura';
  END IF;

  IF p_max_score <= 0 OR p_minimum_score <= 0 OR p_minimum_score > p_max_score THEN
    RAISE EXCEPTION 'Notas inválidas: Se exige minimum_score > 0 y minimum_score <= max_score';
  END IF;

  IF p_display_order < 1 THEN
    RAISE EXCEPTION 'El orden de despliegue debe ser >= 1';
  END IF;

  IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_due_at <= p_opens_at THEN
    RAISE EXCEPTION 'La fecha de cierre debe ser posterior a la fecha de apertura';
  END IF;

  -- Validar source_path seguro
  IF p_source_path IS NOT NULL AND (
    p_source_path ~* '^https?://' OR 
    p_source_path ~* '^javascript:' OR 
    p_source_path ~* '^data:'
  ) THEN
    RAISE EXCEPTION 'El path de la actividad debe ser una ruta relativa del proyecto';
  END IF;

  -- 3. Validar consistencia de año lectivo
  SELECT academic_year_id INTO v_section_year_id FROM public.class_sections WHERE id = p_class_section_id;
  SELECT academic_year_id INTO v_term_year_id FROM public.academic_terms WHERE id = p_academic_term_id;

  IF v_section_year_id IS NULL OR v_term_year_id IS NULL THEN
    RAISE EXCEPTION 'Sección de clase o periodo académico inexistente';
  END IF;

  IF v_section_year_id <> v_term_year_id THEN
    RAISE EXCEPTION 'La sección de clase y el periodo académico deben pertenecer al mismo año lectivo';
  END IF;

  -- 4. Validar grading_config para auto_mcq
  IF p_grader_type = 'auto_mcq' THEN
    IF p_grading_config IS NULL OR 
       jsonb_typeof(p_grading_config->'answers') <> 'object' OR 
       jsonb_object_keys(p_grading_config->'answers') IS NULL THEN
      RAISE EXCEPTION 'Para auto_mcq se requiere un objeto answers no vacío en grading_config';
    END IF;
  END IF;

  -- 5. Si es edición, verificar inmutabilidad estructural si hay historial
  IF v_target_activity_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.activities WHERE id = v_target_activity_id;
    IF v_existing.id IS NULL THEN
      RAISE EXCEPTION 'Actividad no encontrada para edición';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.activity_attempts WHERE activity_id = v_target_activity_id
      UNION ALL
      SELECT 1 FROM public.activity_results WHERE activity_id = v_target_activity_id AND result_status = 'completed'
    ) INTO v_has_history;

    IF v_has_history THEN
      IF v_existing.activity_key <> trim(p_activity_key) OR
         v_existing.activity_type <> p_activity_type OR
         v_existing.class_section_id <> p_class_section_id OR
         v_existing.academic_term_id <> p_academic_term_id OR
         v_existing.unit_number <> p_unit_number OR
         v_existing.max_score <> p_max_score OR
         v_existing.minimum_score <> p_minimum_score THEN
        RAISE EXCEPTION 'No se pueden modificar campos estructurales clave de una actividad que ya posee entregas registradas';
      END IF;
    END IF;
  END IF;

  -- 6. Upsert atómico en public.activities
  IF v_target_activity_id IS NULL THEN
    INSERT INTO public.activities (
      activity_key,
      title,
      activity_type,
      class_section_id,
      academic_term_id,
      unit_number,
      max_score,
      minimum_score,
      source_path,
      display_order,
      is_active,
      opens_at,
      due_at
    ) VALUES (
      trim(p_activity_key),
      trim(p_title),
      p_activity_type,
      p_class_section_id,
      p_academic_term_id,
      p_unit_number,
      p_max_score,
      p_minimum_score,
      p_source_path,
      p_display_order,
      COALESCE(p_is_active, true),
      p_opens_at,
      p_due_at
    ) RETURNING id INTO v_target_activity_id;
  ELSE
    UPDATE public.activities SET
      title = trim(p_title),
      source_path = p_source_path,
      display_order = p_display_order,
      is_active = COALESCE(p_is_active, is_active),
      opens_at = p_opens_at,
      due_at = p_due_at,
      updated_at = now()
    WHERE id = v_target_activity_id;
  END IF;

  -- 7. Upsert atómico en private.activity_grading_configs
  INSERT INTO private.activity_grading_configs (
    activity_id,
    grader_type,
    config
  ) VALUES (
    v_target_activity_id,
    p_grader_type,
    p_grading_config
  )
  ON CONFLICT (activity_id) DO UPDATE SET
    grader_type = EXCLUDED.grader_type,
    config = EXCLUDED.config,
    updated_at = now();

  -- 8. Registro auditor sin exponer solucionario
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_user_id,
    CASE WHEN p_activity_id IS NULL THEN 'activity_created' ELSE 'activity_updated' END,
    'activity',
    v_target_activity_id::text,
    jsonb_build_object(
      'activity_key', trim(p_activity_key),
      'title', trim(p_title),
      'activity_type', p_activity_type,
      'unit_number', p_unit_number,
      'due_at', p_due_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'activity_id', v_target_activity_id,
    'activity_key', trim(p_activity_key)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_upsert_activity(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_activity_key text,
  p_title text,
  p_activity_type text,
  p_class_section_id uuid,
  p_academic_term_id uuid,
  p_unit_number smallint,
  p_max_score numeric,
  p_minimum_score numeric,
  p_source_path text,
  p_display_order integer,
  p_is_active boolean,
  p_opens_at timestamptz,
  p_due_at timestamptz,
  p_grader_type text,
  p_grading_config jsonb
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_upsert_activity(
    p_admin_user_id, p_activity_id, p_activity_key, p_title, p_activity_type,
    p_class_section_id, p_academic_term_id, p_unit_number, p_max_score, p_minimum_score,
    p_source_path, p_display_order, p_is_active, p_opens_at, p_due_at, p_grader_type, p_grading_config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_upsert_activity(uuid, uuid, text, text, text, uuid, uuid, smallint, numeric, numeric, text, integer, boolean, timestamptz, timestamptz, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_activity(uuid, uuid, text, text, text, uuid, uuid, smallint, numeric, numeric, text, integer, boolean, timestamptz, timestamptz, text, jsonb) TO service_role;

-- 2. Función Privada y RPC Gateway para Activar / Desactivar Actividad
CREATE OR REPLACE FUNCTION private.admin_set_activity_active(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_is_active boolean
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_key text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  SELECT activity_key INTO v_key FROM public.activities WHERE id = p_activity_id;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Actividad no encontrada'; END IF;

  UPDATE public.activities SET is_active = p_is_active, updated_at = now() WHERE id = p_activity_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_user_id,
    CASE WHEN p_is_active THEN 'activity_reactivated' ELSE 'activity_deactivated' END,
    'activity',
    p_activity_id::text,
    jsonb_build_object('activity_key', v_key, 'is_active', p_is_active)
  );

  RETURN jsonb_build_object('success', true, 'activity_id', p_activity_id, 'is_active', p_is_active);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_set_activity_active(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_is_active boolean
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_set_activity_active(p_admin_user_id, p_activity_id, p_is_active);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_set_activity_active(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_activity_active(uuid, uuid, boolean) TO service_role;

-- 3. Función Privada y RPC Gateway para Reabrir Plazo de Actividad
CREATE OR REPLACE FUNCTION private.admin_reopen_activity(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_new_due_at timestamptz
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_key text;
  v_deleted_auto_count integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  IF p_new_due_at IS NULL OR p_new_due_at <= now() THEN
    RAISE EXCEPTION 'La nueva fecha de cierre debe ser posterior a la hora actual';
  END IF;

  SELECT activity_key INTO v_key FROM public.activities WHERE id = p_activity_id;
  IF v_key IS NULL THEN RAISE EXCEPTION 'Actividad no encontrada'; END IF;

  UPDATE public.activities SET due_at = p_new_due_at, is_active = true, updated_at = now() WHERE id = p_activity_id;

  -- Eliminar ÚNICAMENTE los registros automáticos de no entrega sin intentos reales
  DELETE FROM public.activity_results
  WHERE activity_id = p_activity_id
    AND result_status = 'not_submitted'
    AND result_source = 'deadline_auto'
    AND attempt_count = 0;

  GET DIAGNOSTICS v_deleted_auto_count = ROW_COUNT;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_user_id,
    'activity_reopened',
    'activity',
    p_activity_id::text,
    jsonb_build_object(
      'activity_key', v_key,
      'new_due_at', p_new_due_at,
      'cleared_auto_not_submitted_count', v_deleted_auto_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'activity_id', p_activity_id,
    'new_due_at', p_new_due_at,
    'cleared_auto_not_submitted_count', v_deleted_auto_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_reopen_activity(
  p_admin_user_id uuid,
  p_activity_id uuid,
  p_new_due_at timestamptz
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_reopen_activity(p_admin_user_id, p_activity_id, p_new_due_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_reopen_activity(uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reopen_activity(uuid, uuid, timestamptz) TO service_role;

-- 4. Función Privada y RPC Gateway para Obtener Datos Consolidados del Gradebook
CREATE OR REPLACE FUNCTION private.admin_get_gradebook_data(p_admin_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_sections jsonb;
  v_students jsonb;
  v_activities jsonb;
  v_results jsonb;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Acceso denegado'; END IF;

  -- Secciones activas
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'grade_number', cs.grade_number,
      'education_level', cs.education_level,
      'parallel', cs.parallel,
      'year_name', ay.name
    )
  ) INTO v_sections
  FROM public.class_sections cs
  JOIN public.academic_years ay ON ay.id = cs.academic_year_id
  WHERE ay.is_active = true;

  -- Estudiantes matriculados activos
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'student_code', s.student_code,
      'official_full_name', s.official_full_name,
      'status', s.status,
      'class_section_id', e.class_section_id
    ) ORDER BY s.official_full_name ASC
  ) INTO v_students
  FROM public.students s
  JOIN public.enrollments e ON e.student_id = s.id AND e.status = 'active'
  WHERE s.status = 'active';

  -- Actividades ordenadas por unidad y despliegue
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'activity_key', a.activity_key,
      'title', a.title,
      'activity_type', a.activity_type,
      'unit_number', a.unit_number,
      'max_score', a.max_score,
      'minimum_score', a.minimum_score,
      'display_order', a.display_order,
      'class_section_id', a.class_section_id
    ) ORDER BY a.unit_number ASC, a.display_order ASC, a.created_at ASC
  ) INTO v_activities
  FROM public.activities a
  WHERE a.is_active = true;

  -- Matriz de resultados
  SELECT jsonb_agg(
    jsonb_build_object(
      'activity_id', ar.activity_id,
      'student_id', ar.student_id,
      'best_score', ar.best_score,
      'attempt_count', ar.attempt_count,
      'result_status', ar.result_status,
      'result_source', ar.result_source
    )
  ) INTO v_results
  FROM public.activity_results ar;

  RETURN jsonb_build_object(
    'sections', COALESCE(v_sections, '[]'::jsonb),
    'students', COALESCE(v_students, '[]'::jsonb),
    'activities', COALESCE(v_activities, '[]'::jsonb),
    'results', COALESCE(v_results, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.admin_get_gradebook_data(p_admin_user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_get_gradebook_data(p_admin_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_get_gradebook_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_gradebook_data(uuid) TO service_role;
