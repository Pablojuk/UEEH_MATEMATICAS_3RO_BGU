-- Reconcile the current per-exercise progress architecture with the historical
-- question-attempt architecture used by submit-activity-result.
--
-- Canonical-source rule (per run):
--   1. If the run has rows in public.activity_exercise_progress, use ONLY
--      those rows. public.activity_exercise_checks remains the immutable audit
--      ledger and is not independently aggregated into the official summary.
--   2. Otherwise, fall back to private.activity_question_attempts so historical
--      runs remain readable. Never combine both generations for the same run.

CREATE OR REPLACE FUNCTION public.get_activity_run_summary(
  p_activity_id uuid,
  p_student_id uuid,
  p_run_id uuid,
  p_phase text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_activity_type text;
  v_has_canonical_progress boolean;
BEGIN
  SELECT a.activity_type
  INTO v_activity_type
  FROM public.activities AS a
  WHERE a.id = p_activity_id;

  IF v_activity_type IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.activity_exercise_progress AS progress
    JOIN public.activity_runs AS run
      ON run.id = progress.activity_run_id
     AND run.activity_id = progress.activity_id
     AND run.student_id = progress.student_id
    WHERE progress.activity_id = p_activity_id
      AND progress.student_id = p_student_id
      AND progress.activity_run_id = p_run_id
  )
  INTO v_has_canonical_progress;

  IF v_has_canonical_progress THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'question_id', progress.exercise_key,
        'terminal_score', COALESCE(progress.exercise_score, 0.00),
        'attempt_count', progress.attempt_count,
        'is_correct', (progress.status = 'correct'),
        'locked', (progress.locked OR progress.status IN ('correct', 'failed'))
      )
      ORDER BY progress.exercise_key
    )
    INTO v_result
    FROM public.activity_exercise_progress AS progress
    JOIN public.activity_runs AS run
      ON run.id = progress.activity_run_id
     AND run.activity_id = progress.activity_id
     AND run.student_id = progress.student_id
    WHERE progress.activity_id = p_activity_id
      AND progress.student_id = p_student_id
      AND progress.activity_run_id = p_run_id;

    RETURN COALESCE(v_result, '[]'::jsonb);
  END IF;

  -- Historical-only fallback. p_phase belongs to the legacy architecture;
  -- canonical progress is already isolated by activity_run_id.
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id', legacy.question_id,
      'terminal_score', legacy.terminal_score,
      'attempt_count', legacy.attempts_count,
      'is_correct', legacy.has_correct,
      'locked', legacy.is_locked
    )
    ORDER BY legacy.question_id
  )
  INTO v_result
  FROM (
    SELECT
      attempts.question_id,
      COALESCE(
        MAX(attempts.question_score) FILTER (WHERE attempts.is_correct),
        MAX(attempts.question_score) FILTER (
          WHERE v_activity_type = 'classwork' AND attempts.attempt_number >= 4
        ),
        0.00
      ) AS terminal_score,
      COUNT(*)::integer AS attempts_count,
      BOOL_OR(attempts.is_correct) AS has_correct,
      BOOL_OR(
        attempts.is_correct
        OR (v_activity_type = 'classwork' AND attempts.attempt_number >= 4)
      ) AS is_locked
    FROM private.activity_question_attempts AS attempts
    WHERE attempts.activity_id = p_activity_id
      AND attempts.student_id = p_student_id
      AND attempts.run_id = p_run_id
      AND attempts.phase = p_phase
    GROUP BY attempts.question_id
  ) AS legacy;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_activity_run_summary(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_run_summary(uuid, uuid, uuid, text)
  TO service_role;
