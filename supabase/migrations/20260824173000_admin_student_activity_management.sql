-- ============================================================================
-- MIGRACIÓN INCREMENTAL: GESTIÓN ADMINISTRATIVA DE ACTIVIDADES POR ESTUDIANTE
-- UEEH MATEMÁTICAS 3.º BGU (REINICIO Y REAPERTURA INDIVIDUAL SEGURA)
-- ============================================================================

-- 1. FUNCIÓN PRIVADA: private.admin_reset_student_activity
CREATE OR REPLACE FUNCTION private.admin_reset_student_activity(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_activity_id uuid,
  p_reason text DEFAULT 'Reinicio administrativo de actividad'
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_student_exists boolean;
  v_activity_key text;
  v_checks_count integer := 0;
  v_progress_count integer := 0;
  v_attempts_count integer := 0;
  v_runs_count integer := 0;
  v_results_count integer := 0;
BEGIN
  -- 1. Validar actor admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos administrativos';
  END IF;

  -- 2. Validar existencia de estudiante y actividad
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE id = p_student_id
  ) INTO v_student_exists;

  IF NOT v_student_exists THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  SELECT activity_key INTO v_activity_key
  FROM public.activities
  WHERE id = p_activity_id;

  IF v_activity_key IS NULL THEN
    RAISE EXCEPTION 'Actividad no encontrada';
  END IF;

  -- Lock transaccional determinista para evitar condiciones de carrera
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':reset'));

  -- 3. Orden estricto de limpieza (únicamente para el estudiante y actividad indicados)
  -- 1) activity_exercise_checks
  DELETE FROM public.activity_exercise_checks
  WHERE student_id = p_student_id AND activity_id = p_activity_id;
  GET DIAGNOSTICS v_checks_count = ROW_COUNT;

  -- 2) activity_exercise_progress
  DELETE FROM public.activity_exercise_progress
  WHERE student_id = p_student_id AND activity_id = p_activity_id;
  GET DIAGNOSTICS v_progress_count = ROW_COUNT;

  -- 3) activity_attempts
  DELETE FROM public.activity_attempts
  WHERE student_id = p_student_id AND activity_id = p_activity_id;
  GET DIAGNOSTICS v_attempts_count = ROW_COUNT;

  -- 4) activity_runs
  DELETE FROM public.activity_runs
  WHERE student_id = p_student_id AND activity_id = p_activity_id;
  GET DIAGNOSTICS v_runs_count = ROW_COUNT;

  -- 5) activity_results
  DELETE FROM public.activity_results
  WHERE student_id = p_student_id AND activity_id = p_activity_id;
  GET DIAGNOSTICS v_results_count = ROW_COUNT;

  -- 4. Registrar en audit_logs
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_admin_user_id,
    'RESET_ACTIVITY',
    'activity',
    p_activity_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'activity_id', p_activity_id,
      'activity_key', v_activity_key,
      'reason', COALESCE(NULLIF(trim(p_reason), ''), 'Reinicio administrativo de actividad'),
      'deleted_checks_count', v_checks_count,
      'deleted_progress_count', v_progress_count,
      'deleted_attempts_count', v_attempts_count,
      'deleted_runs_count', v_runs_count,
      'deleted_results_count', v_results_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'RESET_ACTIVITY',
    'student_id', p_student_id,
    'activity_id', p_activity_id,
    'activity_key', v_activity_key,
    'deleted_checks_count', v_checks_count,
    'deleted_progress_count', v_progress_count,
    'deleted_attempts_count', v_attempts_count,
    'deleted_runs_count', v_runs_count,
    'deleted_results_count', v_results_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Gateway RPC para admin_reset_student_activity
CREATE OR REPLACE FUNCTION public.admin_reset_student_activity(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_activity_id uuid,
  p_reason text DEFAULT 'Reinicio administrativo de actividad'
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_reset_student_activity(p_admin_user_id, p_student_id, p_activity_id, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_reset_student_activity(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_student_activity(uuid, uuid, uuid, text) TO service_role;


-- 2. FUNCIÓN PRIVADA: private.admin_reopen_student_activity
CREATE OR REPLACE FUNCTION private.admin_reopen_student_activity(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_activity_id uuid,
  p_reason text DEFAULT 'Reapertura administrativa de actividad'
)
RETURNS jsonb AS $$
DECLARE
  v_is_admin boolean;
  v_student_exists boolean;
  v_activity_key text;
  v_unlocked_progress_count integer := 0;
  v_unlocked_runs_count integer := 0;
  v_cleared_auto_results_count integer := 0;
BEGIN
  -- 1. Validar actor admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos administrativos';
  END IF;

  -- 2. Validar existencia de estudiante y actividad
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE id = p_student_id
  ) INTO v_student_exists;

  IF NOT v_student_exists THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  SELECT activity_key INTO v_activity_key
  FROM public.activities
  WHERE id = p_activity_id;

  IF v_activity_key IS NULL THEN
    RAISE EXCEPTION 'Actividad no encontrada';
  END IF;

  -- Lock transaccional determinista
  PERFORM pg_advisory_xact_lock(hashtext(p_activity_id::text || ':' || p_student_id::text || ':reopen'));

  -- 3. Retirar bloqueo en progreso de ejercicios sin eliminar historial
  UPDATE public.activity_exercise_progress
  SET locked = false, updated_at = now()
  WHERE student_id = p_student_id
    AND activity_id = p_activity_id
    AND locked = true;
  GET DIAGNOSTICS v_unlocked_progress_count = ROW_COUNT;

  -- 4. Si la actividad tiene resultado de cierre automático sin entregas reales, limpiarlo para permitir entrega
  DELETE FROM public.activity_results
  WHERE student_id = p_student_id
    AND activity_id = p_activity_id
    AND result_status = 'not_submitted'
    AND result_source = 'deadline_auto'
    AND attempt_count = 0;
  GET DIAGNOSTICS v_cleared_auto_results_count = ROW_COUNT;

  -- 5. Si existe un run in_progress, asegurar que quede activo
  UPDATE public.activity_runs
  SET status = 'in_progress'
  WHERE student_id = p_student_id
    AND activity_id = p_activity_id
    AND status = 'in_progress';
  GET DIAGNOSTICS v_unlocked_runs_count = ROW_COUNT;

  -- 6. Registrar en audit_logs
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_admin_user_id,
    'REOPEN_ACTIVITY',
    'activity',
    p_activity_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'activity_id', p_activity_id,
      'activity_key', v_activity_key,
      'reason', COALESCE(NULLIF(trim(p_reason), ''), 'Reapertura administrativa de actividad'),
      'unlocked_progress_count', v_unlocked_progress_count,
      'cleared_auto_results_count', v_cleared_auto_results_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', 'REOPEN_ACTIVITY',
    'student_id', p_student_id,
    'activity_id', p_activity_id,
    'activity_key', v_activity_key,
    'unlocked_progress_count', v_unlocked_progress_count,
    'cleared_auto_results_count', v_cleared_auto_results_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Gateway RPC para admin_reopen_student_activity
CREATE OR REPLACE FUNCTION public.admin_reopen_student_activity(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_activity_id uuid,
  p_reason text DEFAULT 'Reapertura administrativa de actividad'
)
RETURNS jsonb AS $$
BEGIN
  RETURN private.admin_reopen_student_activity(p_admin_user_id, p_student_id, p_activity_id, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_reopen_student_activity(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reopen_student_activity(uuid, uuid, uuid, text) TO service_role;
