-- ============================================================================
-- MIGRACIÓN INCREMENTAL: ARQUITECTURA ACADÉMICA Y RESULTADOS DE UNIDAD 5+
-- UEEH MATEMÁTICAS 3.º BGU (SEGUNDO TRIMESTRE EN ADELANTE)
-- ============================================================================

-- 1. Helper Reutilizable de Actualización de Timestamp
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper Privado para Verificación de Rol Admin
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Helper Privado para Obtención de Student ID desde JWT
CREATE OR REPLACE FUNCTION private.current_student_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM public.students
    WHERE linked_user_id = auth.uid() AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Tabla de Metadata de Actividades Públicas (Unidad 5+)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_key text NOT NULL UNIQUE,
  title text NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('gamification', 'classwork')),
  class_section_id uuid NOT NULL REFERENCES public.class_sections(id) ON DELETE RESTRICT,
  academic_term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  unit_number smallint NOT NULL CHECK (unit_number >= 5),
  max_score numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (max_score > 0),
  source_path text,
  display_order integer NOT NULL DEFAULT 1 CHECK (display_order >= 1),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at para activities
DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 5. Validación de Consistencia de Año Lectivo entre Sección y Periodo Académico
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_activity_consistency ON public.activities;
CREATE TRIGGER trg_check_activity_consistency
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION private.check_activity_section_term_consistency();

-- 6. Configuración Privada de Calificaciones (Servidor Solamente, Sin RLS pública)
CREATE TABLE IF NOT EXISTS private.activity_grading_configs (
  activity_id uuid PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  grader_type text NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_activity_grading_configs_updated_at ON private.activity_grading_configs;
CREATE TRIGGER trg_activity_grading_configs_updated_at
  BEFORE UPDATE ON private.activity_grading_configs
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- Función Privada y RPC Gateway para Lectura Segura de Pauta en Servidor
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_activity_grading_config(p_activity_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN private.get_activity_grading_config(p_activity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_grading_config(uuid) TO service_role;

-- 7. Historial Individual de Intentos de Actividad
CREATE TABLE IF NOT EXISTS public.activity_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  score numeric(5,2) NOT NULL CHECK (score >= 0),
  submission_data jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_student_attempt UNIQUE (activity_id, student_id, attempt_number)
);

-- 8. Resumen Consolidado de Calificaciones (Mejor Nota)
CREATE TABLE IF NOT EXISTS public.activity_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  best_score numeric(5,2) NOT NULL CHECK (best_score >= 0),
  attempt_count integer NOT NULL CHECK (attempt_count >= 1),
  first_completed_at timestamptz NOT NULL DEFAULT now(),
  last_completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_student_results UNIQUE (activity_id, student_id)
);

DROP TRIGGER IF EXISTS trg_activity_results_updated_at ON public.activity_results;
CREATE TRIGGER trg_activity_results_updated_at
  BEFORE UPDATE ON public.activity_results
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 9. Procedimiento Atómico Privado de Registro de Intento y Resumen
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Gateway RPC Público (Solo Ejecutable por service_role)
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

REVOKE EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_activity_attempt(uuid, uuid, numeric, jsonb) TO service_role;

-- 11. Habilitar RLS en Tablas Públicas
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_results ENABLE ROW LEVEL SECURITY;

-- RLS: public.activities
CREATE POLICY "Admin select activities" ON public.activities
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY "Student select active activities enrolled" ON public.activities
  FOR SELECT TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE s.linked_user_id = auth.uid()
        AND s.status = 'active'
        AND e.status = 'active'
        AND e.class_section_id = activities.class_section_id
    )
  );

-- RLS: public.activity_attempts
CREATE POLICY "Admin select attempts" ON public.activity_attempts
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY "Student select own attempts" ON public.activity_attempts
  FOR SELECT TO authenticated
  USING (student_id = private.current_student_id());

-- RLS: public.activity_results
CREATE POLICY "Admin select results" ON public.activity_results
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY "Student select own results" ON public.activity_results
  FOR SELECT TO authenticated
  USING (student_id = private.current_student_id());

-- 12. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_activities_section ON public.activities(class_section_id);
CREATE INDEX IF NOT EXISTS idx_activities_term ON public.activities(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_activity_attempts_student ON public.activity_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_results_student ON public.activity_results(student_id);
