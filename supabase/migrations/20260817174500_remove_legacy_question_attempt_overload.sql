-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN INCREMENTAL: ELIMINACIÓN DE SOBRECARGA LEGACY RECORD_QUESTION_ATTEMPT
-- UEEH MATEMÁTICAS 3.º BGU
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar la firma legacy de private.record_question_attempt con p_question_score
DROP FUNCTION IF EXISTS private.record_question_attempt(
  uuid,
  uuid,
  uuid,
  text,
  text,
  jsonb,
  boolean,
  numeric,
  numeric
);
