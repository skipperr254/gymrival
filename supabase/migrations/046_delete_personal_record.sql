-- ─── Let users delete their own PRs ──────────────────────────────────────────
--
-- Product decision: a user can retract a PR they posted. This removes it from
-- the social feed, PR History, and both leaderboards (all of which query
-- personal_records live — see fetchFeed/fetchPRHistory/global_leaderboard/
-- fetchRivalsLeaderboard — so nothing needs to change there beyond the row
-- going away).
--
-- A raw client-side DELETE against personal_records (the "Users can delete
-- own PRs" RLS policy from migration 004 already permits this) is not enough
-- on its own — it would leave three things stale:
--   - the +50 (and +50 more if a video went 'ready') XP the PR earned via
--     tr_personal_records_award_xp / tr_pr_videos_award_xp
--   - any notifications that reference the now-gone PR (pr_liked, friend_pr)
--   - challenge_participants.score for any active challenge the PR
--     contributed to (update_challenge_scores() only ever increments; there's
--     no reverse trigger for a DELETE)
--
-- This mirrors the one-time bulk cleanup migration 043 already did when
-- purging legacy video-less PRs — same four steps, just scoped to one row and
-- run on demand instead of once. Identity is taken from auth.uid() internally
-- (never a caller-supplied parameter), matching the audit-1.4 pattern used by
-- the other SECURITY DEFINER functions (see migration 032/034).
--
-- Storage cleanup (the actual video/thumbnail files in the pr-videos bucket)
-- can't happen here — SQL can delete the storage.objects metadata row but not
-- the backing blob, only the Storage API can. So this function hands the
-- video's paths back to the caller, which deletes them via
-- supabase.storage.from('pr-videos').remove([...]) the same way the existing
-- video-retry flow already does (see deletePRVideoFiles in lib/api/pr.ts).
-- pr_videos and pr_likes DB rows themselves cascade-delete automatically via
-- their ON DELETE CASCADE FK to personal_records.

CREATE OR REPLACE FUNCTION public.delete_personal_record(p_pr_id UUID)
RETURNS TABLE (
  video_path     TEXT,
  thumbnail_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id      UUID := auth.uid();
  v_owner_id       UUID;
  v_exercise_key   TEXT;
  v_video_path     TEXT;
  v_thumbnail_path TEXT;
  v_video_ready    BOOLEAN;
  v_xp_reclaim     INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT pr.user_id, pr.exercise_key
  INTO   v_owner_id, v_exercise_key
  FROM   public.personal_records pr
  WHERE  pr.id = p_pr_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'PR not found';
  END IF;

  IF v_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Not authorized to delete this PR';
  END IF;

  -- Capture video info before the cascade removes the pr_videos row, so the
  -- caller can clean up the actual Storage files afterward.
  SELECT pv.video_path, pv.thumbnail_path, (pv.status = 'ready')
  INTO   v_video_path, v_thumbnail_path, v_video_ready
  FROM   public.pr_videos pv
  WHERE  pv.pr_id = p_pr_id;

  -- ── 1. Claw back XP (base 50, +50 more if the video ever reached 'ready') ──
  v_xp_reclaim := 50 + (CASE WHEN v_video_ready THEN 50 ELSE 0 END);

  UPDATE public.profiles p
  SET
    xp    = GREATEST(0, p.xp - v_xp_reclaim),
    level = GREATEST(1, GREATEST(0, p.xp - v_xp_reclaim) / 500 + 1)
  WHERE p.id = v_owner_id;

  -- ── 2. Drop notifications that reference this PR ────────────────────────────
  DELETE FROM public.notifications
  WHERE type IN ('pr_liked', 'friend_pr')
    AND (data->>'pr_id')::uuid = p_pr_id;

  -- ── 3. Delete the PR itself (cascades pr_videos + pr_likes rows) ───────────
  DELETE FROM public.personal_records WHERE id = p_pr_id;

  -- ── 4. Recompute this user's active challenge scores for the affected
  --       exercise now that the PR is gone — same per-metric logic as
  --       update_challenge_scores() (migration 018) and the bulk recompute in
  --       migration 043, just scoped to this user + exercise instead of all
  --       challenges. baseline_score is left alone (a join-time snapshot, not
  --       a running total).
  UPDATE public.challenge_participants cp
  SET
    score = CASE c.metric
      WHEN 'highest_pr' THEN
        COALESCE((
          SELECT MAX(pr.value)
          FROM public.personal_records pr
          WHERE pr.user_id      = cp.user_id
            AND pr.exercise_key = c.exercise_key
            AND pr.created_at  BETWEEN c.starts_at AND c.ends_at
        ), 0)

      WHEN 'most_improved' THEN
        GREATEST(0, COALESCE((
          SELECT MAX(pr.value)
          FROM public.personal_records pr
          WHERE pr.user_id      = cp.user_id
            AND pr.exercise_key = c.exercise_key
            AND pr.created_at  >= c.starts_at
        ), 0) - cp.baseline_score)

      WHEN 'total_volume' THEN
        COALESCE((
          SELECT SUM(pr.value)
          FROM public.personal_records pr
          WHERE pr.user_id      = cp.user_id
            AND pr.exercise_key = c.exercise_key
            AND pr.created_at  BETWEEN c.starts_at AND c.ends_at
        ), 0)

      ELSE cp.score
    END,
    score_updated_at = NOW()
  FROM public.challenges c
  WHERE cp.challenge_id  = c.id
    AND cp.user_id       = v_owner_id
    AND cp.status        = 'active'
    AND c.status         = 'active'
    AND c.exercise_key   = v_exercise_key;

  RETURN QUERY SELECT v_video_path, v_thumbnail_path;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_personal_record(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_personal_record(UUID) TO authenticated;
