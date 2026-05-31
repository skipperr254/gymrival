-- Fix infinite recursion between challenges and challenge_participants SELECT policies.
--
-- Root cause: challenges SELECT policy queries challenge_participants to check
-- scope='direct' access, and challenge_participants SELECT policy queries challenges
-- to verify the row belongs to a visible challenge. Each policy triggers the other,
-- causing infinite recursion.
--
-- Fix: replace the challenge_participants SELECT policy with USING (true).
-- Participant data (who's in a challenge, their scores) is intentionally public
-- in a competitive fitness app — showing leaderboards is the whole point.

DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;

CREATE POLICY "Users can view challenge participants"
  ON public.challenge_participants FOR SELECT
  TO authenticated
  USING (true);
