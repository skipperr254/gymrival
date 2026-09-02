-- ─── Fix: friend-challenge creation was non-atomic ──────────────────────────
--
-- Bug: createFriendChallenge() (lib/api/challenges.ts) performed three
-- separate, unrelated inserts (challenges → challenge_participants →
-- challenge_invitations) with no transaction. A network drop between steps
-- could leave a challenge whose creator was never added as a participant
-- (their own challenge shows is_joined: false for them), or an invitation
-- that never got sent. Since the client didn't reload the challenge list on
-- a partial failure and there was no idempotency check, a user retrying
-- after seeing the error could create a duplicate challenge for the same
-- friend pairing.
--
-- Fix: a single SECURITY DEFINER function that performs all three inserts.
-- A PL/pgSQL function body runs as one transaction — any exception (a failed
-- insert, a constraint violation) rolls back everything, so there is no
-- partially-created state to leave behind or retry into.
--
-- Authorization mirrors the RLS policies it replaces exactly:
--   - challenges INSERT (018): type='friend', scope='direct', created_by=self
--   - challenge_invitations INSERT (018): inviter_id=self,
--     challenges.created_by=self (implied here since we just created it)
-- Identity is taken from auth.uid() internally, never a caller-supplied
-- parameter — matching the audit-1.4 fix already applied to the other
-- SECURITY DEFINER challenge functions in migration 032.

CREATE OR REPLACE FUNCTION public.create_friend_challenge(
  p_metric       TEXT,
  p_exercise_key TEXT,
  p_title        TEXT,
  p_description  TEXT,
  p_prize_label  TEXT,
  p_ends_at      TIMESTAMPTZ,
  p_invitee_id   UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id   UUID := auth.uid();
  v_challenge_id UUID;
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.challenges (
    type, scope, metric, exercise_key, title, description, prize_label,
    starts_at, ends_at, created_by, status
  ) VALUES (
    'friend', 'direct', p_metric, p_exercise_key, p_title, p_description, p_prize_label,
    NOW(), p_ends_at, v_creator_id, 'active'
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.challenge_participants (challenge_id, user_id)
  VALUES (v_challenge_id, v_creator_id);

  INSERT INTO public.challenge_invitations (challenge_id, inviter_id, invitee_id)
  VALUES (v_challenge_id, v_creator_id, p_invitee_id);

  RETURN v_challenge_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_friend_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_friend_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) TO authenticated;
