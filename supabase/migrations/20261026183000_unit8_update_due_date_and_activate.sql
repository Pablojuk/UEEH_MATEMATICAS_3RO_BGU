-- ═══════════════════════════════════════════════════════════════════════════
-- ACTUALIZACIÓN OFICIAL: FECHAS Y ACTIVACIÓN UNIDAD 8 (DISTRIBUCIÓN NORMAL)
-- Fecha máxima oficial: martes 10 de noviembre de 2026, 23:59:59 (Ecuador, UTC-5)
-- Timestamp: 2026-11-10T23:59:59-05:00 / 2026-11-11T04:59:59Z
-- Estado: is_active = true
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.activities
SET 
  due_at = '2026-11-10 23:59:59-05'::timestamptz,
  is_active = true,
  updated_at = NOW()
WHERE activity_key IN ('u8-normal-gam-01', 'u8-normal-class-01');
