-- ============================================================================
-- MIGRACIÓN BASE DE DATOS: MÓDULO ADMINISTRATIVO Y CANJE DE CÓDIGOS
-- UEEH MATEMÁTICAS 3.º BGU (ESQUEMA Y CONTROL DE ACCESO DEFINITIVO)
-- ============================================================================

-- 1. Crear esquema privado para la lógica interna
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Secuencia atómica para identificador de estudiante UEEH-STU-XXXXXX
CREATE SEQUENCE IF NOT EXISTS public.student_code_seq START WITH 10;

-- Añadir columna 'student_code' en public.students (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'student_code'
  ) THEN
    ALTER TABLE public.students ADD COLUMN student_code text UNIQUE;
  END IF;
END $$;

-- Asignar student_code a estudiantes existentes que aún no tengan uno
DO $$
DECLARE
  rec RECORD;
  idx integer := 1;
BEGIN
  FOR rec IN SELECT id FROM public.students WHERE student_code IS NULL ORDER BY created_at ASC, id ASC LOOP
    UPDATE public.students 
    SET student_code = 'UEEH-STU-' || lpad(idx::text, 6, '0') 
    WHERE id = rec.id;
    idx := idx + 1;
  END LOOP;

  -- Sincronizar secuencia en 10 para futuros registros
  PERFORM setval('public.student_code_seq', (
    SELECT COALESCE(MAX(CAST(substring(student_code from 10) AS integer)), 9) 
    FROM public.students 
    WHERE student_code LIKE 'UEEH-STU-%'
  ));
END $$;

-- Establecer restricción NOT NULL en student_code tras el backfill
ALTER TABLE public.students ALTER COLUMN student_code SET NOT NULL;

-- 3. Tabla de Registro de Auditoría (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Tabla de Historial de Cuentas Vinculadas (student_account_history)
CREATE TABLE IF NOT EXISTS public.student_account_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'initial_link', 'access_reset'
  old_user_id uuid,
  new_user_id uuid,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_account_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_account_history FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.student_account_history FROM authenticated;
GRANT SELECT ON TABLE public.student_account_history TO authenticated;

DROP POLICY IF EXISTS student_account_history_admin_select ON public.student_account_history;
CREATE POLICY student_account_history_admin_select ON public.student_account_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Tabla e Índice para Rate Limiting (student_claim_attempts)
CREATE TABLE IF NOT EXISTS public.student_claim_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at timestamptz DEFAULT now(),
  success boolean NOT NULL
);

ALTER TABLE public.student_claim_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_claim_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_claim_attempts TO service_role;

CREATE INDEX IF NOT EXISTS idx_student_claim_attempts_user_time 
  ON public.student_claim_attempts (user_id, attempted_at DESC);

-- 6. Índice Único Parcial: Garantizar máximo 1 academic_year con is_active = true
DROP INDEX IF EXISTS idx_academic_years_single_active;
CREATE UNIQUE INDEX idx_academic_years_single_active 
  ON public.academic_years (is_active) 
  WHERE is_active = true;

-- 7. Extensión pgcrypto para digest SHA-256
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- ============================================================================
-- FUNCIONES POSTGRESQL EN SCHEMA private (LÓGICA CORE INTERNA)
-- ============================================================================

-- Función Privada SIN PARÁMETROS para Verificación de Acceso Académico Activo usada por RLS
CREATE OR REPLACE FUNCTION private.has_academic_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_student_status text;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

  IF v_role = 'admin' THEN
    RETURN true;
  ELSIF v_role = 'student' THEN
    SELECT status INTO v_student_status 
    FROM public.students 
    WHERE linked_user_id = v_user_id;

    RETURN (v_student_status = 'active');
  ELSE
    RETURN false;
  END IF;
END;
$$;


-- A. Canjear Código de Activación (private)
CREATE OR REPLACE FUNCTION private.claim_student_code(
  p_user_id uuid,
  p_code_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_role text;
  v_code_hash text;
  v_claim_rec RECORD;
  v_student_rec RECORD;
  v_failed_attempts integer;
  v_student_name text;
  v_generic_error text := 'El código no es válido, ya fue utilizado o no está disponible.';
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', v_generic_error);
  END IF;

  SELECT role INTO v_user_role 
  FROM public.profiles 
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user_role IS NULL OR v_user_role != 'unlinked' THEN
    RETURN jsonb_build_object('success', false, 'error', v_generic_error);
  END IF;

  IF EXISTS (SELECT 1 FROM public.students WHERE linked_user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', v_generic_error);
  END IF;

  SELECT count(*) INTO v_failed_attempts
  FROM public.student_claim_attempts
  WHERE user_id = p_user_id 
    AND success = false 
    AND attempted_at > (now() - interval '15 minutes');

  IF v_failed_attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
  END IF;

  p_code_text := upper(trim(p_code_text));
  v_code_hash := encode(extensions.digest(p_code_text, 'sha256'), 'hex');

  SELECT id, student_id, used_at, revoked_at, expires_at
  INTO v_claim_rec
  FROM public.student_claim_codes
  WHERE code_hash = v_code_hash
  FOR UPDATE;

  IF v_claim_rec.id IS NULL OR v_claim_rec.used_at IS NOT NULL OR v_claim_rec.revoked_at IS NOT NULL OR (v_claim_rec.expires_at IS NOT NULL AND v_claim_rec.expires_at <= now()) THEN
    INSERT INTO public.student_claim_attempts (user_id, success) VALUES (p_user_id, false);
    RETURN jsonb_build_object('success', false, 'error', v_generic_error);
  END IF;

  SELECT id, official_full_name, status, linked_user_id 
  INTO v_student_rec
  FROM public.students
  WHERE id = v_claim_rec.student_id
  FOR UPDATE;

  IF v_student_rec.status != 'active' OR v_student_rec.linked_user_id IS NOT NULL THEN
    INSERT INTO public.student_claim_attempts (user_id, success) VALUES (p_user_id, false);
    RETURN jsonb_build_object('success', false, 'error', v_generic_error);
  END IF;

  v_student_name := v_student_rec.official_full_name;

  UPDATE public.students SET linked_user_id = p_user_id, updated_at = now() WHERE id = v_claim_rec.student_id;
  UPDATE public.profiles SET role = 'student', updated_at = now() WHERE id = p_user_id;
  UPDATE public.student_claim_codes SET used_at = now(), used_by_user_id = p_user_id WHERE id = v_claim_rec.id;

  INSERT INTO public.student_account_history (student_id, action, new_user_id, performed_by, reason)
  VALUES (v_claim_rec.student_id, 'initial_link', p_user_id, p_user_id, 'Vinculación mediante código de activación');

  INSERT INTO public.student_claim_attempts (user_id, success) VALUES (p_user_id, true);

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, 'student_claim_code_success', 'student', v_claim_rec.student_id::text, jsonb_build_object('student_name', v_student_name));

  RETURN jsonb_build_object('success', true, 'message', 'Cuenta vinculada exitosamente', 'student_name', v_student_name, 'student_id', v_claim_rec.student_id);
END;
$$;


-- B. Crear Estudiante (private - Formato oficial de 6 bloques hexadecimales: UEEH-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)
CREATE OR REPLACE FUNCTION private.admin_create_student(
  p_admin_user_id uuid,
  p_full_name text,
  p_class_section_id uuid,
  p_auto_enroll boolean DEFAULT true,
  p_auto_generate_code boolean DEFAULT true,
  p_confirm_homonym boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_student_code text;
  v_student_id uuid;
  v_enrollment_id uuid := NULL;
  v_raw_code text := NULL;
  v_code_hash text := NULL;
  v_homonym_exists boolean := false;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  p_full_name := trim(p_full_name);
  IF length(p_full_name) < 3 THEN
    RAISE EXCEPTION 'El nombre del estudiante debe contener al menos 3 caracteres';
  END IF;

  IF EXISTS (SELECT 1 FROM public.students WHERE lower(official_full_name) = lower(p_full_name)) THEN
    v_homonym_exists := true;
    IF NOT p_confirm_homonym THEN
      RETURN jsonb_build_object(
        'success', false,
        'homonym_warning', true,
        'requires_confirmation', true,
        'message', 'Ya existe un estudiante registrado con el mismo nombre completo. Confirma para continuar.'
      );
    END IF;
  END IF;

  v_student_code := 'UEEH-STU-' || lpad(nextval('public.student_code_seq')::text, 6, '0');

  INSERT INTO public.students (official_full_name, student_code, status)
  VALUES (p_full_name, v_student_code, 'active')
  RETURNING id INTO v_student_id;

  IF p_auto_enroll AND p_class_section_id IS NOT NULL THEN
    INSERT INTO public.enrollments (student_id, class_section_id, status, enrolled_at)
    VALUES (v_student_id, p_class_section_id, 'active', now())
    RETURNING id INTO v_enrollment_id;
  END IF;

  -- Generar Código de Activación con Formato Oficial de 6 bloques hexadecimales: UEEH-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  IF p_auto_generate_code THEN
    v_raw_code := 'UEEH-' || 
                  upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                  upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                  upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                  upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                  upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                  upper(encode(extensions.gen_random_bytes(2), 'hex'));

    v_code_hash := encode(extensions.digest(v_raw_code, 'sha256'), 'hex');

    INSERT INTO public.student_claim_codes (student_id, code_hash)
    VALUES (v_student_id, v_code_hash);
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_create_student', 'student', v_student_id::text, jsonb_build_object('official_full_name', p_full_name, 'student_code', v_student_code));

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'student_code', v_student_code,
    'official_full_name', p_full_name,
    'enrollment_id', v_enrollment_id,
    'raw_claim_code', v_raw_code,
    'homonym_warning', v_homonym_exists
  );
END;
$$;


-- C. Generar Código (private - Formato de 6 bloques hexadecimales)
CREATE OR REPLACE FUNCTION private.admin_generate_claim_code(
  p_admin_user_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_raw_code text;
  v_code_hash text;
  v_student_rec RECORD;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT official_full_name, status, linked_user_id 
  INTO v_student_rec 
  FROM public.students 
  WHERE id = p_student_id;

  IF v_student_rec.official_full_name IS NULL THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  IF v_student_rec.status != 'active' THEN
    RAISE EXCEPTION 'El estudiante se encuentra inactivo. Debe reactivarse primero.';
  END IF;

  IF v_student_rec.linked_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'El estudiante ya cuenta con una cuenta de Google vinculada. Utiliza "Restablecer acceso" para cambio de cuenta.';
  END IF;

  UPDATE public.student_claim_codes
  SET revoked_at = now()
  WHERE student_id = p_student_id AND revoked_at IS NULL AND used_at IS NULL;

  -- Formato Oficial: UEEH-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  v_raw_code := 'UEEH-' || 
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex'));

  v_code_hash := encode(extensions.digest(v_raw_code, 'sha256'), 'hex');

  INSERT INTO public.student_claim_codes (student_id, code_hash)
  VALUES (p_student_id, v_code_hash);

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_generate_claim_code', 'student', p_student_id::text, jsonb_build_object('student_name', v_student_rec.official_full_name));

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'raw_claim_code', v_raw_code);
END;
$$;


-- D. Restablecer Acceso Google (private - Formato de 6 bloques hexadecimales)
CREATE OR REPLACE FUNCTION private.admin_reset_student_access(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_reason text DEFAULT 'Restablecimiento por pérdida de cuenta Google'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_old_user_id uuid;
  v_student_name text;
  v_raw_code text;
  v_code_hash text;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT official_full_name, linked_user_id INTO v_student_name, v_old_user_id FROM public.students WHERE id = p_student_id FOR UPDATE;
  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  IF v_old_user_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'unlinked', updated_at = now() WHERE id = v_old_user_id;
  END IF;

  UPDATE public.students SET linked_user_id = NULL, updated_at = now() WHERE id = p_student_id;
  UPDATE public.student_claim_codes SET revoked_at = now() WHERE student_id = p_student_id AND revoked_at IS NULL AND used_at IS NULL;

  v_raw_code := 'UEEH-' || 
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex')) || '-' ||
                upper(encode(extensions.gen_random_bytes(2), 'hex'));

  v_code_hash := encode(extensions.digest(v_raw_code, 'sha256'), 'hex');

  INSERT INTO public.student_claim_codes (student_id, code_hash) VALUES (p_student_id, v_code_hash);
  INSERT INTO public.student_account_history (student_id, action, old_user_id, new_user_id, performed_by, reason) VALUES (p_student_id, 'access_reset', v_old_user_id, NULL, p_admin_user_id, p_reason);
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (p_admin_user_id, 'admin_reset_student_access', 'student', p_student_id::text, jsonb_build_object('student_name', v_student_name, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'student_name', v_student_name, 'raw_claim_code', v_raw_code);
END;
$$;


-- E. Activar Año Lectivo (private)
CREATE OR REPLACE FUNCTION private.admin_set_active_academic_year(
  p_admin_user_id uuid,
  p_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_year_name text;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT name INTO v_year_name FROM public.academic_years WHERE id = p_year_id;
  IF v_year_name IS NULL THEN
    RAISE EXCEPTION 'Año lectivo no encontrado';
  END IF;

  UPDATE public.academic_years SET is_active = false WHERE is_active = true;
  UPDATE public.academic_years SET is_active = true WHERE id = p_year_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_set_active_academic_year', 'academic_year', p_year_id::text, jsonb_build_object('year_name', v_year_name));

  RETURN jsonb_build_object('success', true, 'year_id', p_year_id, 'year_name', v_year_name);
END;
$$;


-- F. Crear Año Lectivo (private)
CREATE OR REPLACE FUNCTION private.admin_create_academic_year(
  p_admin_user_id uuid,
  p_name text,
  p_set_active boolean DEFAULT false,
  p_create_terms boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_y1 integer;
  v_y2 integer;
  v_year_id uuid;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  p_name := trim(p_name);
  IF p_name !~ '^\d{4}-\d{4}$' THEN
    RAISE EXCEPTION 'Formato de año lectivo inválido. Debe ser YYYY-YYYY (ej. 2027-2028)';
  END IF;

  v_y1 := CAST(split_part(p_name, '-', 1) AS integer);
  v_y2 := CAST(split_part(p_name, '-', 2) AS integer);
  IF v_y2 != v_y1 + 1 THEN
    RAISE EXCEPTION 'El segundo año debe ser exactamente igual al primero + 1 (ej. 2027-2028)';
  END IF;

  IF EXISTS (SELECT 1 FROM public.academic_years WHERE name = p_name) THEN
    RAISE EXCEPTION 'El año lectivo % ya existe en el sistema', p_name;
  END IF;

  IF p_set_active THEN
    UPDATE public.academic_years SET is_active = false WHERE is_active = true;
  END IF;

  INSERT INTO public.academic_years (name, is_active) VALUES (p_name, p_set_active) RETURNING id INTO v_year_id;

  IF p_create_terms THEN
    INSERT INTO public.academic_terms (academic_year_id, term_number, name) VALUES
      (v_year_id, 1, 'Primer Trimestre'),
      (v_year_id, 2, 'Segundo Trimestre'),
      (v_year_id, 3, 'Tercer Trimestre');
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_create_academic_year', 'academic_year', v_year_id::text, jsonb_build_object('name', p_name, 'is_active', p_set_active));

  RETURN jsonb_build_object('success', true, 'year_id', v_year_id, 'name', p_name);
END;
$$;


-- G. Matricular Estudiante Existente con Validación Previa (private)
CREATE OR REPLACE FUNCTION private.admin_enroll_student(
  p_admin_user_id uuid,
  p_student_id uuid,
  p_class_section_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_enrollment_id uuid;
  v_student_rec RECORD;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT official_full_name, status INTO v_student_rec FROM public.students WHERE id = p_student_id;
  IF v_student_rec.official_full_name IS NULL THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  IF v_student_rec.status != 'active' THEN
    RAISE EXCEPTION 'El estudiante está inactivo. Debe reactivarse antes de matricularlo.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.class_sections WHERE id = p_class_section_id) THEN
    RAISE EXCEPTION 'La sección de clase no existe';
  END IF;

  IF EXISTS (SELECT 1 FROM public.enrollments WHERE student_id = p_student_id AND class_section_id = p_class_section_id) THEN
    RAISE EXCEPTION 'El estudiante ya se encuentra matriculado en esta sección de clase';
  END IF;

  INSERT INTO public.enrollments (student_id, class_section_id, status, enrolled_at)
  VALUES (p_student_id, p_class_section_id, 'active', now())
  RETURNING id INTO v_enrollment_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_enroll_student', 'enrollment', v_enrollment_id::text, jsonb_build_object('student_name', v_student_rec.official_full_name));

  RETURN jsonb_build_object('success', true, 'enrollment_id', v_enrollment_id);
END;
$$;


-- H. Crear Sección de Clase / Paralelo (private - Esquema Real: grade_number smallint, education_level text)
CREATE OR REPLACE FUNCTION private.admin_create_class_section(
  p_admin_user_id uuid,
  p_academic_year_id uuid,
  p_grade_number smallint,
  p_education_level text DEFAULT 'BGU',
  p_parallel text DEFAULT 'A'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_section_id uuid;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  p_education_level := trim(p_education_level);
  p_parallel := upper(trim(p_parallel));

  IF p_grade_number IS NULL OR p_grade_number < 1 OR p_grade_number > 3 THEN
    RAISE EXCEPTION 'El número de curso debe estar entre 1 y 3';
  END IF;

  IF length(p_education_level) = 0 THEN
    RAISE EXCEPTION 'El nivel educativo no puede estar vacío';
  END IF;

  IF p_parallel !~ '^[A-Z]$' THEN
    RAISE EXCEPTION 'El paralelo debe ser exactamente una letra mayúscula (ej. A, B, C)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.class_sections 
    WHERE academic_year_id = p_academic_year_id 
      AND grade_number = p_grade_number 
      AND lower(education_level) = lower(p_education_level) 
      AND parallel = p_parallel
  ) THEN
    RAISE EXCEPTION 'Ya existe el paralelo % para % ° % en este año lectivo', p_parallel, p_grade_number, p_education_level;
  END IF;

  INSERT INTO public.class_sections (academic_year_id, grade_number, education_level, parallel)
  VALUES (p_academic_year_id, p_grade_number, p_education_level, p_parallel)
  RETURNING id INTO v_section_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_create_class_section', 'class_section', v_section_id::text, jsonb_build_object('grade_number', p_grade_number, 'education_level', p_education_level, 'parallel', p_parallel));

  RETURN jsonb_build_object('success', true, 'section_id', v_section_id);
END;
$$;


-- I. Desactivar Estudiante (private - Conserva vinculación de Google)
CREATE OR REPLACE FUNCTION private.admin_deactivate_student(
  p_admin_user_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_student_name text;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT official_full_name INTO v_student_name FROM public.students WHERE id = p_student_id;
  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  UPDATE public.students SET status = 'inactive', updated_at = now() WHERE id = p_student_id;
  UPDATE public.student_claim_codes SET revoked_at = now() WHERE student_id = p_student_id AND used_at IS NULL AND revoked_at IS NULL;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_deactivate_student', 'student', p_student_id::text, jsonb_build_object('student_name', v_student_name));

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id);
END;
$$;


-- J. Reactivar Estudiante (private)
CREATE OR REPLACE FUNCTION private.admin_reactivate_student(
  p_admin_user_id uuid,
  p_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_role text;
  v_student_name text;
BEGIN
  IF p_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado: No autenticado';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_user_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador';
  END IF;

  SELECT official_full_name INTO v_student_name FROM public.students WHERE id = p_student_id;
  IF v_student_name IS NULL THEN
    RAISE EXCEPTION 'Estudiante no encontrado';
  END IF;

  UPDATE public.students SET status = 'active', updated_at = now() WHERE id = p_student_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_user_id, 'admin_reactivate_student', 'student', p_student_id::text, jsonb_build_object('student_name', v_student_name));

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id);
END;
$$;


-- ============================================================================
-- FUNCIONES RPC GATEWAY PÚBLICAS (SCHEMA public) PARA INVOCACIÓN DESDE SERVICE_ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_academic_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.has_academic_access(); END; $$;

CREATE OR REPLACE FUNCTION public.claim_student_code(p_user_id uuid, p_code_text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.claim_student_code(p_user_id, p_code_text); END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_student(p_admin_user_id uuid, p_full_name text, p_class_section_id uuid, p_auto_enroll boolean DEFAULT true, p_auto_generate_code boolean DEFAULT true, p_confirm_homonym boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_create_student(p_admin_user_id, p_full_name, p_class_section_id, p_auto_enroll, p_auto_generate_code, p_confirm_homonym); END; $$;

CREATE OR REPLACE FUNCTION public.admin_generate_claim_code(p_admin_user_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_generate_claim_code(p_admin_user_id, p_student_id); END; $$;

CREATE OR REPLACE FUNCTION public.admin_reset_student_access(p_admin_user_id uuid, p_student_id uuid, p_reason text DEFAULT 'Restablecimiento por pérdida de cuenta Google')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_reset_student_access(p_admin_user_id, p_student_id, p_reason); END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_active_academic_year(p_admin_user_id uuid, p_year_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_set_active_academic_year(p_admin_user_id, p_year_id); END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_academic_year(p_admin_user_id uuid, p_name text, p_set_active boolean DEFAULT false, p_create_terms boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_create_academic_year(p_admin_user_id, p_name, p_set_active, p_create_terms); END; $$;

CREATE OR REPLACE FUNCTION public.admin_enroll_student(p_admin_user_id uuid, p_student_id uuid, p_class_section_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_enroll_student(p_admin_user_id, p_student_id, p_class_section_id); END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_class_section(p_admin_user_id uuid, p_academic_year_id uuid, p_grade_number smallint, p_education_level text DEFAULT 'BGU', p_parallel text DEFAULT 'A')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_create_class_section(p_admin_user_id, p_academic_year_id, p_grade_number, p_education_level, p_parallel); END; $$;

CREATE OR REPLACE FUNCTION public.admin_deactivate_student(p_admin_user_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_deactivate_student(p_admin_user_id, p_student_id); END; $$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_student(p_admin_user_id uuid, p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN RETURN private.admin_reactivate_student(p_admin_user_id, p_student_id); END; $$;


-- ============================================================================
-- CONTROL DE PERMISOS: REVOCAR EXECUTE A NAVEGADOR/REST, PERMITIR SOLO SERVICE_ROLE
-- ============================================================================

REVOKE EXECUTE ON FUNCTION private.has_academic_access() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.claim_student_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_create_student(uuid, text, uuid, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_generate_claim_code(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_reset_student_access(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_set_active_academic_year(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_create_academic_year(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_enroll_student(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_create_class_section(uuid, uuid, smallint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_deactivate_student(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_reactivate_student(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_academic_access() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_student_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_student(uuid, text, uuid, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_generate_claim_code(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_student_access(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_active_academic_year(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_academic_year(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_enroll_student(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_class_section(uuid, uuid, smallint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_deactivate_student(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reactivate_student(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.has_academic_access() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION private.claim_student_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_create_student(uuid, text, uuid, boolean, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_generate_claim_code(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_reset_student_access(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_set_active_academic_year(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_create_academic_year(uuid, text, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_enroll_student(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_create_class_section(uuid, uuid, smallint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_deactivate_student(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.admin_reactivate_student(uuid, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.has_academic_access() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_student_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_student(uuid, text, uuid, boolean, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_generate_claim_code(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_student_access(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_active_academic_year(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_academic_year(uuid, text, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_enroll_student(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_class_section(uuid, uuid, smallint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_student(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_student(uuid, uuid) TO service_role;
