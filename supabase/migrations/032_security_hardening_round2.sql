-- =============================================================================
-- 032_security_hardening_round2.sql
-- Fixes for findings from the 2026-07-19 security audit (audits/01-security.md).
-- =============================================================================


-- =============================================================================
-- (A) friendships: close the consent-bypass hole (audit 1.7, CRITICAL)
-- =============================================================================
-- Problem: the UPDATE policy had no WITH CHECK, so Postgres reused USING for
-- both. USING only requires auth.uid() to be *some* party to the row — it
-- never restricted which columns changed or which status transitions are
-- valid. That let the requester silently self-accept their own outgoing
-- request (no consent from the addressee ever required), and let either
-- party reassign the *other* party's id to an arbitrary victim while keeping
-- the row passing the check (since only their own id needed to remain
-- correct on the new row).
--
-- Fix, two layers:
--   1. Column-level grant restricts UPDATE to `status` only, so requester_id/
--      addressee_id can never be changed by any UPDATE statement (mirrors the
--      pattern already used for profiles/challenge_participants in 024).
--   2. A BEFORE UPDATE trigger enforces who may perform which status
--      transition: only the addressee may move pending -> accepted; either
--      party may move to blocked; anything else is rejected.

REVOKE UPDATE ON public.friendships FROM authenticated;
GRANT UPDATE (status) ON public.friendships TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_friendship_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    IF auth.uid() IS DISTINCT FROM OLD.addressee_id THEN
      RAISE EXCEPTION 'Only the request recipient can accept a friend request';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid friendship status transition from % to %', OLD.status, NEW.status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_friendship_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_friendship_status_transition ON public.friendships;
CREATE TRIGGER trg_enforce_friendship_status_transition
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_friendship_status_transition();

-- Explicit WITH CHECK for defense-in-depth / documentation (functionally
-- redundant with the column grant above, since requester_id/addressee_id can
-- no longer appear in any UPDATE's SET list, but making the row-ownership
-- requirement explicit costs nothing and keeps this policy self-describing).
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE TO authenticated
  USING (((select auth.uid()) = requester_id) OR ((select auth.uid()) = addressee_id))
  WITH CHECK (((select auth.uid()) = requester_id) OR ((select auth.uid()) = addressee_id));


-- =============================================================================
-- (B) Shared visibility helper for challenges (fixes audit 1.4 and 1.6)
-- =============================================================================
-- Extracted so both the `challenges` and `challenge_participants` SELECT
-- policies can share one correct definition, instead of each re-deriving it
-- (which is how 029's rewrite introduced the `cp.challenge_id = cp.id`
-- self-referencing bug in the first place). SECURITY DEFINER lets this be
-- called from challenge_participants' own policy without re-triggering
-- challenges' RLS (and vice versa) — the same recursion 019 worked around by
-- making challenge_participants fully public; this restores real visibility
-- rules without reintroducing the recursion.

CREATE OR REPLACE FUNCTION public.user_can_view_challenge(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND (
        c.created_by = p_user_id
        OR c.scope = 'global'
        OR (
          c.scope = 'friends_only'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = p_user_id AND f.addressee_id = c.created_by)
                OR (f.addressee_id = p_user_id AND f.requester_id = c.created_by)
              )
          )
        )
        OR (
          c.scope = 'direct'
          AND (
            EXISTS (
              SELECT 1 FROM public.challenge_participants cp
              WHERE cp.challenge_id = c.id AND cp.user_id = p_user_id
            )
            OR EXISTS (
              SELECT 1 FROM public.challenge_invitations ci
              WHERE ci.challenge_id = c.id AND ci.invitee_id = p_user_id
            )
          )
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_can_view_challenge(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_view_challenge(UUID, UUID) TO authenticated;


-- =============================================================================
-- (C) challenges + challenge_participants SELECT: use the helper (audit 1.4, 1.6)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view relevant challenges" ON public.challenges;
CREATE POLICY "Users can view relevant challenges" ON public.challenges
  FOR SELECT TO authenticated
  USING (public.user_can_view_challenge(id, (select auth.uid())));

-- Replaces the fully-public USING(true) from 019. That migration made this
-- public purely to break a recursion bug — user_can_view_challenge() (B)
-- breaks the same recursion without giving up real visibility, so private
-- (direct/friends_only) challenge participation and scores are no longer
-- readable by every authenticated user.
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;
CREATE POLICY "Users can view challenge participants" ON public.challenge_participants
  FOR SELECT TO authenticated
  USING (public.user_can_view_challenge(challenge_id, (select auth.uid())));


-- =============================================================================
-- (D) challenge_participants INSERT: enforce scope, not just capacity (audit 1.2)
-- =============================================================================
-- Problem: the join policy checked the challenge was active and under its
-- participant cap, but never checked scope — so anyone could insert
-- themselves into a private direct/friends_only challenge without an
-- invitation or friendship.

DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.user_can_view_challenge(challenge_id, (select auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_participants.challenge_id
        AND c.status = 'active'
        AND (
          c.max_participants IS NULL
          OR (
            SELECT COUNT(*) FROM public.challenge_participants cp2
            WHERE cp2.challenge_id = c.id AND cp2.status = 'active'
          ) < c.max_participants
        )
    )
  );


-- =============================================================================
-- (E) challenge_leaderboard() / active_challenges_for_user(): stop trusting
--     caller-supplied ids (audit 1.4)
-- =============================================================================
-- Both RPCs are SECURITY DEFINER and previously used their p_viewer_id /
-- p_user_id *parameters* — supplied by the caller — for both authorization
-- and personalisation. Since the function owner bypasses RLS, any
-- authenticated caller could pass an arbitrary id and read another user's
-- (or another challenge's) private data. Both now derive identity from
-- auth.uid() internally; the parameters are kept (unused) so client call
-- sites and the function signatures don't need to change.

CREATE OR REPLACE FUNCTION public.challenge_leaderboard(
  p_challenge_id UUID,
  p_viewer_id    UUID
)
RETURNS TABLE (
  user_id          UUID,
  full_name        TEXT,
  username         TEXT,
  avatar_url       TEXT,
  level            INT,
  score            NUMERIC,
  baseline_score   NUMERIC,
  rank             BIGINT,
  joined_at        TIMESTAMPTZ,
  is_me            BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cp.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.level,
    cp.score,
    cp.baseline_score,
    RANK() OVER (ORDER BY cp.score DESC, cp.joined_at ASC) AS rank,
    cp.joined_at,
    (cp.user_id = (select auth.uid())) AS is_me
  FROM   public.challenge_participants cp
  JOIN   public.profiles p ON p.id = cp.user_id
  WHERE  cp.challenge_id = p_challenge_id
    AND  cp.status       = 'active'
    AND  public.user_can_view_challenge(p_challenge_id, (select auth.uid()))
  ORDER BY cp.score DESC, cp.joined_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.active_challenges_for_user(
  p_user_id UUID,
  p_locale  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  type              TEXT,
  scope             TEXT,
  metric            TEXT,
  exercise_key      TEXT,
  title             TEXT,
  description       TEXT,
  icon              TEXT,
  prize_label       TEXT,
  reward_xp         INTEGER,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  status            TEXT,
  created_by        UUID,
  winner_user_id    UUID,
  participant_count BIGINT,
  is_joined         BOOLEAN,
  user_score        NUMERIC,
  user_rank         BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH visible AS (
    SELECT c.id
    FROM   public.challenges c
    WHERE  c.status IN ('active', 'completed')
      AND  public.user_can_view_challenge(c.id, (select auth.uid()))
  ),
  counts AS (
    SELECT   challenge_id, COUNT(*) AS cnt
    FROM     public.challenge_participants
    WHERE    status = 'active'
    GROUP BY challenge_id
  ),
  my_parts AS (
    SELECT challenge_id, score
    FROM   public.challenge_participants
    WHERE  user_id = (select auth.uid()) AND status = 'active'
  ),
  ranked AS (
    SELECT
      cp.challenge_id,
      RANK() OVER (PARTITION BY cp.challenge_id ORDER BY cp.score DESC, cp.joined_at ASC) AS rnk,
      cp.user_id
    FROM public.challenge_participants cp
    WHERE cp.status = 'active'
  )
  SELECT
    c.id,
    c.type,
    c.scope,
    c.metric,
    c.exercise_key,
    COALESCE(ct.title, c.title)             AS title,
    COALESCE(ct.description, c.description) AS description,
    c.icon,
    c.prize_label,
    c.reward_xp,
    c.starts_at,
    c.ends_at,
    c.status,
    c.created_by,
    c.winner_user_id,
    COALESCE(counts.cnt, 0)             AS participant_count,
    (my_parts.challenge_id IS NOT NULL) AS is_joined,
    my_parts.score                      AS user_score,
    ranked.rnk                          AS user_rank
  FROM   public.challenges c
  JOIN   visible v ON v.id = c.id
  LEFT JOIN counts               ON counts.challenge_id = c.id
  LEFT JOIN my_parts              ON my_parts.challenge_id = c.id
  LEFT JOIN ranked                ON ranked.challenge_id = c.id AND ranked.user_id = (select auth.uid())
  LEFT JOIN challenge_translations ct ON ct.challenge_id = c.id AND ct.locale = p_locale
  ORDER BY c.starts_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.challenge_leaderboard(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.challenge_leaderboard(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.active_challenges_for_user(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.active_challenges_for_user(UUID, TEXT) TO authenticated;


-- =============================================================================
-- (F) challenges: cap reward_xp and stop post-creation tampering (audit 1.3)
-- =============================================================================
-- Problem: a regular user can only create type='friend' challenges, but
-- nothing capped `reward_xp`, and the UPDATE policy granted full-row rewrite
-- to the creator (including reward_xp and status), so a self-created,
-- self-joined challenge could be given an arbitrary reward and then
-- immediately marked 'completed' by its own creator for unlimited XP.
--
-- Fix, three layers:
--   1. CHECK constraint caps reward_xp for friend challenges at table level
--      (admin challenges are unaffected — admins are already a trusted role).
--   2. Column-level grant restricts UPDATE to `status` only — reward_xp can
--      never be raised after creation by a non-admin. (winner_user_id is
--      still written by the award_challenge_xp() trigger via direct NEW.
--      assignment, which isn't subject to the caller's column grants.)
--   3. A trigger blocks a friend challenge from being marked 'completed'
--      early (before its scheduled ends_at) unless it has at least 2 active
--      participants — closes the "create + solo-complete instantly" loop.

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_friend_reward_xp_cap
  CHECK (type <> 'friend' OR reward_xp <= 200);

REVOKE UPDATE ON public.challenges FROM authenticated;
GRANT UPDATE (status) ON public.challenges TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_challenge_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active_participants INT;
BEGIN
  IF NEW.status = 'completed'
    AND OLD.status IS DISTINCT FROM 'completed'
    AND NEW.type = 'friend'
    AND NOW() < NEW.ends_at
  THEN
    SELECT COUNT(*) INTO v_active_participants
    FROM public.challenge_participants
    WHERE challenge_id = NEW.id AND status = 'active';

    IF v_active_participants < 2 THEN
      RAISE EXCEPTION 'A friend challenge needs at least 2 active participants to complete before its end date';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_challenge_completion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_challenge_completion ON public.challenges;
CREATE TRIGGER trg_enforce_challenge_completion
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_completion();


-- =============================================================================
-- (G) gyms: close the self-verify gap (audit 1.5)
-- =============================================================================
-- WITH CHECK previously only re-asserted ownership, not is_verified = false,
-- so a user could flip their own submitted gym's verified badge to true.

DROP POLICY IF EXISTS "Users can update own submitted gyms" ON public.gyms;
CREATE POLICY "Users can update own submitted gyms" ON public.gyms
  FOR UPDATE TO authenticated
  USING (((select auth.uid()) = created_by) AND (is_verified = false))
  WITH CHECK (((select auth.uid()) = created_by) AND (is_verified = false));


-- =============================================================================
-- (H) personal_records: reject non-positive values (audit §6)
-- =============================================================================

ALTER TABLE public.personal_records
  ADD CONSTRAINT personal_records_value_positive CHECK (value > 0);


-- =============================================================================
-- (I) profiles: stop leaking email / expo_push_token to other users (audit 4.1)
-- =============================================================================
-- Problem: SELECT RLS is USING(true) for all authenticated users, and — unlike
-- UPDATE, which 024/025 already restricted to a safe column allowlist —
-- SELECT was never column-restricted. Combined with fetchProfile()'s
-- `select("*")` (fixed in the same change as this migration), any signed-in
-- user could read every other user's email and Expo push token, either
-- through normal app flows or a direct REST call.
--
-- Fix: column-level SELECT grant, same allowlist pattern as the UPDATE grant,
-- excluding `email` and `expo_push_token`. Neither column is actually needed
-- cross-user (the client already reads the signed-in user's own email from
-- the Supabase Auth session (`user.email`), never from `profiles.email` — see
-- app/(tabs)/profile/index.tsx and edit.tsx) or same-user (nothing in the UI
-- displays a user's own push token). RLS row policies can't do column-level
-- restriction on their own, so this has to be a column GRANT.

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  full_name,
  username,
  avatar_url,
  gym,
  weight_kg,
  height_cm,
  goal,
  bio,
  quote,
  xp,
  level,
  is_pro,
  streak,
  friends_count,
  role,
  language,
  country_code,
  created_at,
  updated_at
) ON public.profiles TO authenticated;
