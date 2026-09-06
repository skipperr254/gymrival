-- =============================================================================
-- 047_challenge_admin_completion.sql
-- Closes the loop on challenge completion: nothing has ever flipped a
-- challenge's status to 'completed', so award_challenge_xp() (018) never
-- fired, winner_user_id was never set, and no UI could ever call out a
-- winner. This adds a scheduled sweep that completes expired challenges of
-- every type (admin AND friend), fixes a bug where a winner was only ever
-- recorded when reward_xp > 0 (most admin challenges will carry a text-only
-- prize_label with reward_xp = 0), and notifies the winner.
-- =============================================================================

-- ── 1. Enable pg_cron ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 2. Allow the new notification type ───────────────────────────────────────

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'new_message',
      'friend_request',
      'friend_request_accepted',
      'pr_liked',
      'friend_pr',
      'challenge_won'
    )
  );

-- ── 3. Fix + extend award_challenge_xp() ─────────────────────────────────────
--
-- Previous bug: winner_user_id was only computed/set when reward_xp > 0,
-- inside the same IF as the XP award. A challenge with no XP reward (the
-- common case for a text-only prize_label) never got a winner at all.
--
-- Fix: determine the winner unconditionally whenever status transitions to
-- 'completed' and at least one participant exists. XP is still only awarded
-- when reward_xp > 0. A 'challenge_won' notification is inserted for the
-- winner whenever one is found — this reuses the existing push pipeline
-- (028_push_notification_webhook.sql's tr_notifications_push fires on any
-- INSERT into notifications, no separate wiring needed).
--
-- Tie-break now matches challenge_leaderboard()'s own ordering
-- (score DESC, joined_at ASC) so the declared winner always matches rank 1
-- in the leaderboard the client already renders.

CREATE OR REPLACE FUNCTION public.award_challenge_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT cp.user_id
    INTO   v_winner_id
    FROM   public.challenge_participants cp
    WHERE  cp.challenge_id = NEW.id
      AND  cp.status       = 'active'
    ORDER BY cp.score DESC, cp.joined_at ASC
    LIMIT 1;

    IF v_winner_id IS NOT NULL THEN
      NEW.winner_user_id := v_winner_id;

      IF NEW.reward_xp > 0 THEN
        UPDATE public.profiles
        SET
          xp    = xp + NEW.reward_xp,
          level = GREATEST(1, (xp + NEW.reward_xp) / 500 + 1)
        WHERE id = v_winner_id;
      END IF;

      INSERT INTO public.notifications (user_id, type, actor_id, data)
      VALUES (
        v_winner_id,
        'challenge_won',
        NULL,
        jsonb_build_object(
          'challenge_id', NEW.id,
          'title',        NEW.title,
          'prize_label',  NEW.prize_label
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_challenge_xp() FROM anon, authenticated;

-- Trigger tr_challenges_award_xp already targets this function (018) — no
-- need to recreate it, CREATE OR REPLACE above is enough.

-- ── 4. Scheduled sweep: complete expired challenges ──────────────────────────
--
-- Runs every 15 minutes. A plain UPDATE ... WHERE fires the per-row
-- tr_challenges_award_xp trigger for every challenge it touches, so this one
-- function is the entire completion pipeline for both admin and friend
-- challenges alike.

CREATE OR REPLACE FUNCTION public.complete_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH done AS (
    UPDATE public.challenges
    SET    status = 'completed'
    WHERE  status = 'active'
      AND  ends_at <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM done;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_expired_challenges() FROM anon, authenticated;

SELECT cron.schedule(
  'complete-expired-challenges',
  '*/15 * * * *',
  $$SELECT public.complete_expired_challenges();$$
);
