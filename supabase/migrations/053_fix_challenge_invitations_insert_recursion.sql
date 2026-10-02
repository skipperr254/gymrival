-- =============================================================================
-- 053_fix_challenge_invitations_insert_recursion.sql
-- Preemptive fix for the same recursion class as 051
-- (challenge_participants), found by auditing every RLS policy touching the
-- challenges cluster after that bug: "Challenge creator can send
-- invitations" (034/018) does a plain, non-SECURITY-DEFINER subquery
-- directly against `challenges`:
--   EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = ... AND c.created_by = auth.uid())
-- `challenges`' SELECT policy (049/050) queries back into
-- challenge_invitations for its 'direct' scope branch, forming the same kind
-- of two-table cycle Postgres refuses with "infinite recursion detected in
-- policy for relation challenge_invitations" -- confirmed empirically with a
-- direct insert.
--
-- This is currently DORMANT in production: the only write path today is
-- create_friend_challenge() (034), a SECURITY DEFINER function that bypasses
-- RLS entirely, so no user has hit this yet. But it will fire the moment any
-- feature inserts into challenge_invitations directly from the client (e.g.
-- "invite more friends to an existing challenge") -- fixing now while the
-- pattern and root cause are fresh, rather than waiting for it to surface.
--
-- Fix: same idiom as 051 -- move the cross-table check into a SECURITY
-- DEFINER function. Verified: the actual creator can still insert an
-- invitation; a non-creator is still correctly rejected.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_challenge_creator(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = p_challenge_id AND c.created_by = p_user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_challenge_creator(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_challenge_creator(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Challenge creator can send invitations" ON public.challenge_invitations;
CREATE POLICY "Challenge creator can send invitations"
  ON public.challenge_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = inviter_id
    AND public.is_challenge_creator(challenge_id, (select auth.uid()))
  );
