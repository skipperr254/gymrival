-- ─── Compulsory PR video proof: purge legacy video-less PRs ─────────────────
--
-- Product decision: PR video proof is no longer optional. The client (Step2
-- of LogPRSheet) now blocks saving a PR until a video is attached, so from
-- this point on every new personal_records row is always paired with a
-- pr_videos row created moments later by uploadPRVideo().
--
-- Note on enforcement: Postgres has no built-in way to declare "a matching
-- child row in another table must exist" as a static constraint, and the
-- client's two-step flow (create the PR row, then stream the video bytes to
-- Storage asynchronously) means a single-transaction guarantee isn't
-- practical from a mobile client either. Compulsory video is therefore
-- enforced at the application layer (Step2's disabled Save button + the
-- `!videoAsset` guard in LogPRSheet.handleSave), not by a DB constraint.
--
-- This migration purges pre-existing personal_records rows that were logged
-- before this rule existed and never got a video attached at all, so the
-- data looks uniform going forward. Rows that have a pr_videos row but it's
-- stuck in 'uploading' or ended up 'failed' are NOT touched — those reflect
-- a genuine attempt at a video (recoverable via the retry affordance already
-- built into FeedPostCard), not a PR logged without one.
--
-- Order of operations matters here — each step depends on personal_records
-- still containing the rows being purged, so the DELETE runs last.

-- ── 1. Claw back the +50 XP that award_pr_xp() granted for each row being
--       purged (pr_videos never existed for these rows, so award_video_xp()
--       never fired — no video-bonus XP to reclaim).
WITH purge_counts AS (
  SELECT pr.user_id, COUNT(*) AS n
  FROM public.personal_records pr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pr_videos pv WHERE pv.pr_id = pr.id
  )
  GROUP BY pr.user_id
)
UPDATE public.profiles p
SET
  xp    = GREATEST(0, p.xp - (pc.n * 50)),
  level = GREATEST(1, GREATEST(0, p.xp - (pc.n * 50)) / 500 + 1)
FROM purge_counts pc
WHERE p.id = pc.user_id;

-- ── 2. Drop notifications that reference a PR about to be purged.
--       notifications.data->>'pr_id' is a plain JSONB value (no FK), so it
--       would otherwise dangle and any UI that deep-links from the
--       notification to its PR would hit a missing row.
DELETE FROM public.notifications
WHERE type IN ('pr_liked', 'friend_pr')
  AND (data->>'pr_id')::uuid IN (
    SELECT pr.id
    FROM public.personal_records pr
    WHERE NOT EXISTS (
      SELECT 1 FROM public.pr_videos pv WHERE pv.pr_id = pr.id
    )
  );

-- ── 3. Delete the video-less PRs themselves.
--       Cascades this triggers automatically:
--         - pr_videos.pr_id  ON DELETE CASCADE — no-op here (none exist for
--           these rows by definition of the WHERE clause).
--         - pr_likes.pr_id   ON DELETE CASCADE — any likes on a video-less
--           PR are removed along with it (test data, no dedicated backup).
--       Nothing else references personal_records.id via FK.
DELETE FROM public.personal_records pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.pr_videos pv WHERE pv.pr_id = pr.id
);

-- ── 4. Recompute challenge_participants.score for active challenges.
--       update_challenge_scores() (migration 018) only ever *increments*
--       score as PRs come in — there's no reverse trigger for a DELETE, so
--       scores that were partly built from now-purged PRs would otherwise
--       stay stale. Recomputing from scratch against the remaining
--       personal_records exactly reproduces what the trigger's cumulative
--       GREATEST/SUM logic would have produced without those rows, so this
--       is safe to run unconditionally and idempotently.
--
--       Only 'active' challenges are touched — same as the trigger, which
--       never updates a completed challenge's score. baseline_score is left
--       alone: it's a point-in-time snapshot taken at join time, not a
--       running total, so it isn't invalidated by a later purge.
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
WHERE cp.challenge_id = c.id
  AND cp.status        = 'active'
  AND c.status         = 'active';
