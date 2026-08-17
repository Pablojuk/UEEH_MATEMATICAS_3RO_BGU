-- ═══════════════════════════════════════════════════════════════════════════
-- PROVISIONALIZACIÓN ESTRUCTURAL DE ACTIVIDADES UNIDAD 5 (DETERMINANTES)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_section_id uuid;
  v_term_id uuid;
BEGIN
  SELECT id INTO v_section_id FROM public.class_sections LIMIT 1;
  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'No class section found';
  END IF;

  SELECT id INTO v_term_id FROM public.academic_terms WHERE term_number = 2 LIMIT 1;
  IF v_term_id IS NULL THEN
    SELECT id INTO v_term_id FROM public.academic_terms LIMIT 1;
  END IF;

  -- 1. Actividad Gamificación: u5-determinantes-gam-01
  INSERT INTO public.activities (
    activity_key, class_section_id, academic_term_id, title, activity_type, unit_number,
    max_score, minimum_score, is_active, opens_at, due_at, display_order, source_path
  ) VALUES (
    'u5-determinantes-gam-01', v_section_id, v_term_id, 'Gamificación: Odisea Espacial (Determinantes)',
    'gamification', 5, 10.00, 1.00, true, '2026-08-16 00:00:00-05', '2026-08-27 23:59:59-05', 1,
    'topics/unit5-determinantes/gamificacion.html'
  )
  ON CONFLICT (activity_key) DO UPDATE SET
    title = EXCLUDED.title,
    due_at = EXCLUDED.due_at,
    is_active = EXCLUDED.is_active,
    academic_term_id = EXCLUDED.academic_term_id,
    source_path = EXCLUDED.source_path;

  -- 2. Actividad Trabajo en Clase: u5-determinantes-class-01
  INSERT INTO public.activities (
    activity_key, class_section_id, academic_term_id, title, activity_type, unit_number,
    max_score, minimum_score, is_active, opens_at, due_at, display_order, source_path
  ) VALUES (
    'u5-determinantes-class-01', v_section_id, v_term_id, 'Trabajo en Clase: Determinantes de Matrices 2x2 y 3x3',
    'classwork', 5, 10.00, 1.00, true, '2026-08-16 00:00:00-05', '2026-08-27 23:59:59-05', 2,
    'topics/unit5-determinantes/deber.html'
  )
  ON CONFLICT (activity_key) DO UPDATE SET
    title = EXCLUDED.title,
    due_at = EXCLUDED.due_at,
    is_active = EXCLUDED.is_active,
    academic_term_id = EXCLUDED.academic_term_id,
    source_path = EXCLUDED.source_path;

END $$;
