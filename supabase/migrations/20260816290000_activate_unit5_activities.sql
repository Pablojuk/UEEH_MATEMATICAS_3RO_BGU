-- Migration: 20260816290000_activate_unit5_activities.sql
-- Description: Activate Unit 5 activities for production students after hardening completion

UPDATE public.activities
SET is_active = true,
    updated_at = statement_timestamp()
WHERE activity_key IN ('u5-determinantes-gam-01', 'u5-determinantes-class-01');
