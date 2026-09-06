-- =============================================================================
-- 051_fix_challenge_participants_join_recursion.sql
-- Fixes: "infinite recursion detected in policy for relation
-- challenge_participants" when joining a challenge (join a challenge,
-- including an admin joining their own newly-created challenge).
--
-- Root cause: the "Users can join challenges" INSERT policy on
-- challenge_participants (032) contained a plain, non-SECURITY-DEFINER
-- subquery directly against `challenges`:
--   EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = ... AND ... )
-- `challenges` has its own SELECT policy (049/050), and evaluating that plain
-- subquery requires applying it. Combined with challenge_participants' own
-- SELECT policy also being non-trivial, Postgres's RLS planner detects this
-- as a policy recursion cycle between the two tables and refuses the query --
-- confirmed empirically: removing this one clause (keeping everything else,
-- including the existing user_can_view_challenge() SECURITY DEFINER call)
-- eliminates the recursion; adding it back (with or without the function
-- call) reintroduces it every time.
--
-- This mirrors exactly the class of bug 032 already solved once for the
-- challenges/challenge_participants SELECT policies via
-- user_can_view_challenge() -- the fix here is the same idiom: move the
-- cross-table "is this challenge still joinable" check into its own
-- SECURITY DEFINER function so the INSERT policy never runs a plain
-- cross-table subquery itself.
--
-- Verified: a normal join still succeeds; a second join once
-- max_participants is reached is still correctly rejected.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.challenge_is_joinable(p_challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND c.status = 'active'
      AND (
        c.max_participants IS NULL
        OR (
          SELECT COUNT(*) FROM public.challenge_participants cp2
          WHERE cp2.challenge_id = c.id AND cp2.status = 'active'
        ) < c.max_participants
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.challenge_is_joinable(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.challenge_is_joinable(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.user_can_view_challenge(challenge_id, (select auth.uid()))
    AND public.challenge_is_joinable(challenge_id)
  );
