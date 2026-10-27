-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: ESTUDIANTE DE PRUEBAS AUTORIZADO PARA DOCENTE/ADMINISTRADOR
-- Permite pruebas funcionales reales en entorno autenticado sin alterar
-- las calificaciones oficiales ni los historiales de los estudiantes reales.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Crear o actualizar estudiante de pruebas vinculado a la cuenta del docente
INSERT INTO public.students (
  id,
  official_full_name,
  student_code,
  status,
  linked_user_id
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'DOCENTE PRUEBAS (PABLO JUCA)',
  'UEEH-DOC-TEST',
  'active',
  'f77d410e-6c0e-469a-a9e6-063bf99ea969'
)
ON CONFLICT (id) DO UPDATE SET
  official_full_name = EXCLUDED.official_full_name,
  student_code = EXCLUDED.student_code,
  status = 'active',
  linked_user_id = EXCLUDED.linked_user_id,
  updated_at = NOW();

-- 2. Asegurar matrícula activa en la sección académica correspondiente (3ro BGU A)
INSERT INTO public.enrollments (
  student_id,
  class_section_id,
  status,
  enrolled_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'd9603077-3914-491d-898b-d6d0fc93e574',
  'active',
  NOW()
)
ON CONFLICT (student_id, class_section_id) DO UPDATE SET
  status = 'active';

-- 3. Actualizar función canónica private.current_student_id() con fallback seguro para admin
CREATE OR REPLACE FUNCTION private.current_student_id()
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Primero buscar si el usuario autenticado es un estudiante real
  SELECT id INTO v_id 
  FROM public.students
  WHERE linked_user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Si el usuario es administrador, vincularlo de forma aislada al estudiante de pruebas
  IF private.is_admin() THEN
    SELECT id INTO v_id
    FROM public.students
    WHERE student_code = 'UEEH-DOC-TEST' AND status = 'active'
    LIMIT 1;
    RETURN v_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';
