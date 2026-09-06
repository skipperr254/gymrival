-- =============================================================================
-- 050_fix_challenges_select_policy_column_qualifier.sql
-- Fixes a bug introduced in 049: the "direct" scope branch's EXISTS
-- subqueries referenced an unqualified `id`, intending the outer
-- challenges.id, but both challenge_participants and challenge_invitations
-- also have their own `id` primary key column -- SQL scoping rules resolve
-- an unqualified column name to the innermost matching table, so `id` inside
-- each subquery was silently captured by that subquery's own table instead
-- of the outer challenges row (e.g. "cp.challenge_id = cp.id" instead of
-- "cp.challenge_id = challenges.id"). That made the direct-scope EXISTS
-- checks compare each row's own challenge_id against its own primary key --
-- effectively always false -- so a direct/friend challenge became invisible
-- to its participants and invitees (only the creator could still see it, via
-- the separate created_by branch). Verified with a synthetic direct
-- challenge + non-creator participant before and after this fix.
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
            (f.requester_id = (select auth.uid()) AND f.addressee_id = challenges.created_by)
            OR (f.addressee_id = (select auth.uid()) AND f.requester_id = challenges.created_by)
          )
      )
    )
    OR (
      scope = 'direct'
      AND (
        EXISTS (
          SELECT 1 FROM public.challenge_participants cp
          WHERE cp.challenge_id = challenges.id AND cp.user_id = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.challenge_invitations ci
          WHERE ci.challenge_id = challenges.id AND ci.invitee_id = (select auth.uid())
        )
      )
    )
  );
