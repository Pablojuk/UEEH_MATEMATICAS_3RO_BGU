-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: INTEGRIDAD DE CALIFICACIÓN OFICIAL DEFINITIVA
-- Y SOPORTE DE PROMEDIO DE RECUPERACIÓN (UNIDAD 5+)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROPÓSITO:
-- 1. Añadir columnas a public.activity_results para distinguir:
--    - final_score: Calificación oficial definitiva consolidada.
--    - initial_score: Calificación oficial de la fase ordinaria/inicial.
--    - recovery_score: Calificación oficial de la fase de recuperación (si aplica).
--    - best_score: Mejor calificación histórica alcanzada (conservada para auditoría).
-- 2. Actualizar private.record_activity_attempt para registrar final_score de manera
--    que respete la calificación oficial calculada por el calificador (ej. promedio de recuperación).
-- 3. Actualizar private.admin_get_gradebook_data para que el libro de calificaciones
--    y exportaciones Excel reflejen fielmente la calificación oficial consolidada.
--
-- COMPATIBILIDAD Y SEGURIDAD:
-- - No altera datos existentes; las nuevas columnas son opcionales con fallback a best_score.
-- - No rompe consultas anteriores: cualquier consulta que lea best_score continuará funcionando.
-- - Totalmente reversible mediante el bloque de rollback documentado al final.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Agregar columnas incrementales a public.activity_results
ALTER TABLE public.activity_results 
  ADD COLUMN IF NOT EXISTS final_score numeric(5,2) NULL,
  ADD COLUMN IF NOT EXISTS initial_score numeric(5,2) NULL,
  ADD COLUMN IF NOT EXISTS recovery_score numeric(5,2) NULL;

COMMENT ON COLUMN public.activity_results.final_score IS 'Calificación oficial definitiva consolidada. En actividades con recuperación bajo política de promedio, almacena (nota_inicial + nota_recuperacion)/2.';
COMMENT ON COLUMN public.activity_results.initial_score IS 'Calificación obtenida en la fase ordinaria o inicial.';
COMMENT ON COLUMN public.activity_results.recovery_score IS 'Calificación obtenida en la fase de recuperación (NULL si no aplicó recuperación).';

-- Poblar retrospectivamente final_score con best_score en registros existentes para garantizar continuidad
UPDATE public.activity_results 
SET final_score = best_score 
WHERE final_score IS NULL;

-- 2. Asegurar configuración de recovery_policy = 'average' para Trabajo en Clase de Unidad 7
-- en la tabla canónica de configuración privada: private.activity_grading_configs
-- (Garantiza que la política se aplique en producción sin asumir la reejecución de migraciones previas)
UPDATE private.activity_grading_configs
SET config = jsonb_set(config, '{recovery_policy}', '"average"')
WHERE activity_id = (
  SELECT id FROM public.activities WHERE activity_key = 'u7-binomial-class-01'
)
AND (config->>'recovery_policy' IS NULL OR config->>'recovery_policy' != 'average');

-- 3. Actualizar private.record_activity_attempt con gestión explícita de final_score
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
  v_phase text;
  v_raw_initial numeric(5,2);
  v_rec_score numeric(5,2);
BEGIN
  -- Concurrencia segura: Lock determinista por estudiante y actividad
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text));

  -- 1. Detección de Retry Idempotente
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
      'final_score', v_existing_attempt.score,
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

  -- Validación de rango permitido
  IF p_score < v_min_score OR p_score > v_max_score THEN
    RAISE EXCEPTION 'Calificación oficial fuera del rango permitido [%, %]', v_min_score, v_max_score;
  END IF;

  -- Siguiente número de intento
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_attempt_number
  FROM public.activity_attempts
  WHERE activity_id = p_activity_id AND student_id = p_student_id;

  -- Registrar nuevo intento individual en historial inmutable
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

  -- Extraer fase y métricas del submission_data si están presentes
  v_phase := COALESCE(p_submission_data->>'phase', 'initial');
  IF p_submission_data ? 'raw_initial_score' THEN
    v_raw_initial := (p_submission_data->>'raw_initial_score')::numeric;
  END IF;
  IF p_submission_data ? 'recovery_score' THEN
    v_rec_score := (p_submission_data->>'recovery_score')::numeric;
  END IF;

  -- Insertar o actualizar resumen consolidado en public.activity_results
  SELECT * INTO v_existing_results
  FROM public.activity_results
  WHERE activity_id = p_activity_id AND student_id = p_student_id;

  IF v_existing_results.id IS NULL THEN
    INSERT INTO public.activity_results (
      activity_id,
      student_id,
      best_score,
      final_score,
      initial_score,
      recovery_score,
      attempt_count,
      result_status,
      result_source,
      first_completed_at,
      last_completed_at
    ) VALUES (
      p_activity_id,
      p_student_id,
      p_score,
      p_score,
      COALESCE(v_raw_initial, p_score),
      v_rec_score,
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
      final_score = p_score,
      initial_score = COALESCE(v_existing_results.initial_score, v_raw_initial, v_existing_results.best_score),
      recovery_score = COALESCE(v_rec_score, v_existing_results.recovery_score),
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
    'final_score', p_score,
    'max_score', v_max_score,
    'best_score', GREATEST(COALESCE(v_existing_results.best_score, 0), p_score),
    'attempt_count', COALESCE(v_existing_results.attempt_count, 0) + 1,
    'registered_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION private.record_activity_attempt(uuid, uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated, service_role;

-- 3. Actualizar Gateway RPC Público
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

-- 4. Actualizar private.admin_get_gradebook_data para incluir final_score
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
      'name', cs.name,
      'grade_number', cs.grade_number,
      'education_level', cs.education_level,
      'parallel', cs.parallel,
      'year_name', ay.name
    ) ORDER BY cs.grade_number ASC, cs.parallel ASC
  ) INTO v_sections
  FROM public.class_sections cs
  JOIN public.academic_years ay ON ay.id = cs.academic_year_id;

  -- Estudiantes activos
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

  -- Matriz de resultados con final_score oficial
  SELECT jsonb_agg(
    jsonb_build_object(
      'activity_id', ar.activity_id,
      'student_id', ar.student_id,
      'best_score', ar.best_score,
      'final_score', COALESCE(ar.final_score, ar.best_score),
      'initial_score', ar.initial_score,
      'recovery_score', ar.recovery_score,
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

-- ═══════════════════════════════════════════════════════════════════════════
-- PROCEDIMIENTO DE ROLLBACK SEGURO (NO DESTRUCTIVO):
-- ═══════════════════════════════════════════════════════════════════════════
-- En caso de requerir reversión técnica, NO ELIMINAR las columnas final_score, initial_score
-- ni recovery_score para evitar cualquier pérdida de datos académicos ya registrados.
--
-- PASO 1 (Inmediato - Sin DDL destructivo):
-- Restaurar las Edge Functions (submit-activity-result, check-activity-answer, admin-api)
-- a su versión previa en Git. El backend retomará su lógica anterior de inmediato.
--
-- PASO 2 (Reversión de política en configuración de actividad):
-- UPDATE private.activity_grading_configs
-- SET config = jsonb_set(config, '{recovery_policy}', '"max"')
-- WHERE activity_id = (SELECT id FROM public.activities WHERE activity_key = 'u7-binomial-class-01');
--
-- PASO 3 (Restaurar funciones RPC a su versión de 20260816243000 si fuera estrictamente requerido):
-- Se conservan las columnas añadidas en activity_results como datos históricos de auditoría,
-- garantizando 100% de integridad sin DROP COLUMN destructivo.
