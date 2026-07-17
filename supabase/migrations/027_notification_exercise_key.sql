-- =============================================================================
-- 027_notification_exercise_key.sql
-- Fixes notification text being frozen in whatever language was active when
-- the row was written.
-- =============================================================================
-- handle_pr_liked_notification() and handle_friend_pr_notification() (from
-- 021_create_notifications.sql) copied exercise_types.label into
-- notifications.data->>'exercise_label' as plain text at INSERT time. That
-- text could never change language later — it was baked into the row
-- permanently. Storing the stable exercise_key instead lets the client
-- resolve the display name via i18n at render time, in whatever language the
-- viewer currently has active.

-- ── Backfill existing rows ────────────────────────────────────────────────────
-- exercise_types.label values are unique, so historical rows can still be
-- mapped back to their exercise_key before the column is removed.

UPDATE public.notifications n
SET data = (data - 'exercise_label') || jsonb_build_object('exercise_key', et.key)
FROM public.exercise_types et
WHERE n.data ? 'exercise_label'
  AND n.data->>'exercise_label' = et.label;

-- ── Trigger 3: PR liked ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_pr_liked_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr RECORD;
BEGIN
  SELECT pr.user_id, pr.exercise_key, pr.value, pr.unit
  INTO v_pr
  FROM personal_records pr
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
      'pr_id',        NEW.pr_id,
      'exercise_key', v_pr.exercise_key,
      'value',        v_pr.value,
      'unit',         v_pr.unit
    )
  );

  RETURN NEW;
END;
$$;

-- ── Trigger 4: friend posted a new PR ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_friend_pr_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friend RECORD;
BEGIN
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
        'pr_id',        NEW.id,
        'exercise_key', NEW.exercise_key,
        'value',        NEW.value,
        'unit',         NEW.unit
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;
