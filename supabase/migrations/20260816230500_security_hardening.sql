-- ============================================================================
-- MIGRACIÓN INCREMENTAL: SECURITY HARDENING
-- UEEH MATEMÁTICAS 3.º BGU
-- Eliminar exposición innecesaria de la pasarela pública public.has_academic_access()
-- ============================================================================

DROP FUNCTION IF EXISTS public.has_academic_access();
