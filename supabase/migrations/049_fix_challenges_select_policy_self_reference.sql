-- =============================================================================
-- 049_fix_challenges_select_policy_self_reference.sql
-- Fixes: "new row violates row-level security policy for table challenges"
-- when creating an admin challenge via the client's INSERT ... RETURNING id
-- (lib/api/challenges.ts createAdminChallenge()).
--
-- Root cause: migration 032 rewrote the challenges SELECT policy to call
-- user_can_view_challenge(id, auth.uid()), which internally re-queries
-- public.challenges BY ID to look up scope/created_by, rather than
-- referencing the current row's own columns directly. For a plain SELECT
-- this self-referencing subquery evaluates fine, but for INSERT ... RETURNING
-- on challenges itself, PostgreSQL re-checks the SELECT policy against the
-- newly-inserted row as part of producing the RETURNING output, and a
-- self-referencing subquery back into the very table being inserted into
-- does not reliably see that row in this context -- the check fails and
-- Postgres reports it as a row-level security violation.
--
-- This never surfaced before because every existing insert path either
-- avoided RETURNING (challenge_participants inserts via joinChallenge()) or
-- ran inside a SECURITY DEFINER function that returns a plain scalar instead
-- of using PostgREST's INSERT...RETURNING (create_friend_challenge()).
--
-- Fix: restore an inline USING clause on challenges' own SELECT policy
-- (matching the original 018 logic, with 029's initplan-optimized auth.uid()
-- calls) that references the row's own id/created_by/scope columns directly
-- instead of re-querying the table. user_can_view_challenge() itself is left
-- untouched -- challenge_participants' policies use it safely, since there
-- it's a genuine cross-table reference to challenges, not a self-reference.
-- Verified: friends_only/direct visibility rules unchanged (a non-admin,
-- non-participant, non-invitee user still sees zero unrelated direct
-- challenges under the new policy).
-- =============================================================================

DROP POLICY IF EXISTS "Users can view relevant challenges" ON public.challenges;

CREATE POLICY "Users can view relevant challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR scope = 'global'
    OR (
      scope = 'friends_only'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = (select auth.uid()) AND f.addressee_id = created_by)
            OR (f.addressee_id = (select auth.uid()) AND f.requester_id = created_by)
          )
      )
    )
    OR (
      scope = 'direct'
      AND (
        EXISTS (
          SELECT 1 FROM public.challenge_participants cp
          WHERE cp.challenge_id = id AND cp.user_id = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.challenge_invitations ci
          WHERE ci.challenge_id = id AND ci.invitee_id = (select auth.uid())
        )
      )
    )
  );
