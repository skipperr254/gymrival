-- 021_create_notifications.sql
-- Notification centre: table, RLS, realtime, and four triggers

CREATE TABLE public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  actor_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (
    type IN (
      'new_message',
      'friend_request',
      'friend_request_accepted',
      'pr_liked',
      'friend_pr'
    )
  )
);

CREATE INDEX notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX notifications_unread_idx
  ON public.notifications(user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── Trigger 1: new message ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv       RECORD;
  v_recipient  UUID;
BEGIN
  SELECT participant_a, participant_b
  INTO v_conv
  FROM conversations
  WHERE id = NEW.conversation_id;

  v_recipient := CASE
    WHEN v_conv.participant_a = NEW.sender_id THEN v_conv.participant_b
    ELSE v_conv.participant_a
  END;

  IF v_recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, data)
  VALUES (
    v_recipient,
    'new_message',
    NEW.sender_id,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_preview',  LEFT(NEW.content, 80)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();

-- ─── Trigger 2: friend request / accepted ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_friendship_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, actor_id, data)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      NEW.requester_id,
      jsonb_build_object('friendship_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, actor_id, data)
    VALUES (
      NEW.requester_id,
      'friend_request_accepted',
      NEW.addressee_id,
      jsonb_build_object('friendship_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friendship_change_notify
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_notification();

-- ─── Trigger 3: PR liked ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_pr_liked_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr RECORD;
BEGIN
  SELECT pr.user_id, e.label AS exercise_label, pr.value, pr.unit
  INTO v_pr
  FROM personal_records pr
  JOIN exercise_types e ON e.key = pr.exercise_key
  WHERE pr.id = NEW.pr_id;

  IF v_pr.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, data)
  VALUES (
    v_pr.user_id,
    'pr_liked',
    NEW.user_id,
    jsonb_build_object(
      'pr_id',           NEW.pr_id,
      'exercise_label',  v_pr.exercise_label,
      'value',           v_pr.value,
      'unit',            v_pr.unit
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pr_liked_notify
  AFTER INSERT ON public.pr_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pr_liked_notification();

-- ─── Trigger 4: friend posted a new PR ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_friend_pr_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label  TEXT;
  v_friend RECORD;
BEGIN
  SELECT label INTO v_label
  FROM exercise_types
  WHERE key = NEW.exercise_key;

  FOR v_friend IN
    SELECT
      CASE
        WHEN requester_id = NEW.user_id THEN addressee_id
        ELSE requester_id
      END AS friend_id
    FROM friendships
    WHERE (requester_id = NEW.user_id OR addressee_id = NEW.user_id)
      AND status = 'accepted'
  LOOP
    INSERT INTO notifications (user_id, type, actor_id, data)
    VALUES (
      v_friend.friend_id,
      'friend_pr',
      NEW.user_id,
      jsonb_build_object(
        'pr_id',          NEW.id,
        'exercise_label', v_label,
        'value',          NEW.value,
        'unit',           NEW.unit
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_pr_notify
  AFTER INSERT ON public.personal_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_pr_notification();
