-- =============================================================================
-- 054_pr_visibility.sql
-- B3a: free users log PRs privately; publishing to the feed is Pro.
-- =============================================================================
-- Context
--   There is no separate "post" entity in this app. `personal_records` IS the
--   social feed (see lib/api/feed.ts) — one row is simultaneously the user's
--   own record, the leaderboard input, and the feed post. So "no posting PRs"
--   cannot be a UI toggle; it needs a real visibility model.
--
-- What stays free
--   Logging a PR, PR history, personal bests, Progress charts, XP, and
--   appearing on BOTH leaderboards. A private PR still counts for everything
--   except the feed. That is deliberate: if free users vanished from the
--   leaderboards, the board would empty out, and the board is what Pro is
--   being sold against.
--
-- Deliberate non-goal
--   A lapsing subscriber does NOT have their existing public PRs retracted.
--   Hiding content someone already published is user-hostile and is not what
--   "Pro gates publishing" means. Downgrade blocks NEW public posts only.
-- =============================================================================


-- ── 1. Entitlement helper ────────────────────────────────────────────────────
-- Used by every gate from here on (3a, 3b, 3c). SECURITY DEFINER so a policy
-- never depends on the caller's own RLS view of `profiles`.
--
-- `profiles.is_pro` is itself server-owned (migration 044) and mirrors
-- `public.subscriptions` — this reads the mirror, never the provider.
CREATE OR REPLACE FUNCTION public.is_pro_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  SELECT COALESCE((SELECT p.is_pro FROM public.profiles p WHERE p.id = p_user_id), false);
$fn$;

REVOKE ALL ON FUNCTION public.is_pro_user(uuid) FROM public, anon;
-- `authenticated` needs EXECUTE because RLS policies below call it as the
-- invoking user. This leaks nothing new: `profiles.is_pro` is already in the
-- client's SELECT grant.
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;


-- ── 2. The visibility column ─────────────────────────────────────────────────
ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personal_records_visibility_check'
  ) THEN
    ALTER TABLE public.personal_records
      ADD CONSTRAINT personal_records_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

COMMENT ON COLUMN public.personal_records.visibility IS
  'public = appears in the social feed. private = owner-only; still counts for PR history, Progress, XP and both leaderboards. Forced to private on insert for non-Pro users by tr_personal_records_visibility.';

-- Every existing row predates the gate and was posted under "everything is
-- public" rules. The column default already made them public; this is the
-- explicit statement of that choice. Retroactively privatising them would
-- silently delete people's feed history.

-- The feed pages by author set + recency over public rows only.
CREATE INDEX IF NOT EXISTS idx_personal_records_public_feed
  ON public.personal_records (user_id, created_at DESC)
  WHERE visibility = 'public';


-- ── 3. Server-side enforcement of who may publish ────────────────────────────
-- A trigger, not a policy: a policy can only accept or reject the whole row,
-- whereas this quietly downgrades `public` to `private` so a free user's PR is
-- still logged rather than being rejected outright. Logging is free; only
-- reaching the feed is not.
CREATE OR REPLACE FUNCTION public.enforce_pr_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  IF NEW.visibility = 'public' AND NOT public.is_pro_user(NEW.user_id) THEN
    -- On UPDATE, only interfere when they are actually trying to publish.
    -- A row that was already public (posted while subscribed) stays public.
    IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM 'public' THEN
      NEW.visibility := 'private';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.enforce_pr_visibility() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS tr_personal_records_visibility ON public.personal_records;
CREATE TRIGGER tr_personal_records_visibility
  BEFORE INSERT OR UPDATE OF visibility ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pr_visibility();


-- ── 4. Who can read a PR ─────────────────────────────────────────────────────
-- Was: USING (true) — every authenticated user could read every PR.
DROP POLICY IF EXISTS "Authenticated users can read all PRs" ON public.personal_records;
DROP POLICY IF EXISTS "personal_records_select" ON public.personal_records;
CREATE POLICY "personal_records_select"
  ON public.personal_records FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR visibility = 'public'
  );


-- ── 5. Video proof is Pro-only ───────────────────────────────────────────────
DROP POLICY IF EXISTS "pr_videos_insert_own" ON public.pr_videos;
CREATE POLICY "pr_videos_insert_own"
  ON public.pr_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_pro_user((SELECT auth.uid()))
  );

-- A video hanging off a private PR must not be readable by others either —
-- otherwise the gate leaks through the join.
DROP POLICY IF EXISTS "pr_videos_select_auth" ON public.pr_videos;
DROP POLICY IF EXISTS "pr_videos_select" ON public.pr_videos;
CREATE POLICY "pr_videos_select"
  ON public.pr_videos FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.personal_records pr
       WHERE pr.id = pr_videos.pr_id
         AND pr.visibility = 'public'
    )
  );


-- ── 6. Rivals leaderboard must stop reading the table directly ───────────────
-- `fetchRivalsLeaderboard` in lib/api/leaderboard.ts queried personal_records
-- for the whole friend group. With section 4 in place that query silently
-- starts under-reporting friends' bests — it fails quietly and looks like a
-- data bug, which is the sharpest edge in this whole migration.
--
-- Note there is no p_user_id parameter: the circle is derived from auth.uid()
-- inside the function. A SECURITY DEFINER function that accepted a user id
-- would let any caller read any other user's friends' private PRs.
CREATE OR REPLACE FUNCTION public.rivals_leaderboard(p_exercise_key text)
RETURNS TABLE (
  user_id    uuid,
  full_name  text,
  username   text,
  avatar_url text,
  level      integer,
  best_pr    numeric,
  unit       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
  WITH me AS (SELECT auth.uid() AS id),
  circle AS (
    SELECT id FROM me
    UNION
    SELECT CASE WHEN f.requester_id = (SELECT id FROM me)
                THEN f.addressee_id ELSE f.requester_id END
      FROM public.friendships f
     WHERE f.status = 'accepted'
       AND ((SELECT id FROM me) IN (f.requester_id, f.addressee_id))
  ),
  best AS (
    SELECT pr.user_id,
           MAX(pr.value) AS best_pr,
           (ARRAY_AGG(pr.unit ORDER BY pr.value DESC))[1] AS unit
      FROM public.personal_records pr
      JOIN circle c ON c.id = pr.user_id
     WHERE pr.exercise_key = p_exercise_key
     GROUP BY pr.user_id
  )
  SELECT b.user_id, pf.full_name, pf.username, pf.avatar_url,
         pf.level, b.best_pr, b.unit
    FROM best b
    JOIN public.profiles pf ON pf.id = b.user_id
   ORDER BY b.best_pr DESC, pf.username ASC;
$fn$;

REVOKE ALL ON FUNCTION public.rivals_leaderboard(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rivals_leaderboard(text) TO authenticated;
