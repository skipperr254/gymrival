-- =============================================================================
-- 028_push_notification_webhook.sql
-- Wires up push notifications: every row inserted into `notifications` now
-- triggers a webhook call to the `send-notification` edge function, which
-- composes the push title/body server-side using the RECIPIENT's stored
-- language (see supabase/functions/send-notification/index.ts).
-- =============================================================================
-- Why server-side instead of client-side:
--   Notifications are triggered by another user's action (e.g. A likes B's
--   PR). If the client composed push text, it would compose it in A's
--   language, not B's — the recipient would get push copy in the wrong
--   language. Doing it here, driven by B's own `profiles.language`, is the
--   only way to get this right regardless of who caused the notification.
--
-- Security:
--   The edge function has verify_jwt disabled (it's called by Postgres, not
--   the app) and instead checks a shared secret header. That secret is never
--   embedded in this migration file (this file is committed to git) — it
--   must be provisioned once, manually, by a project admin:
--     1. Generate a random value yourself, e.g. `openssl rand -hex 32`.
--     2. Store it in Vault:
--          select vault.create_secret('<value>', 'push_webhook_secret');
--     3. Set the SAME value as an edge function secret (Dashboard ->
--        Edge Functions -> send-notification -> Secrets ->
--        PUSH_WEBHOOK_SECRET, or `supabase secrets set PUSH_WEBHOOK_SECRET=<value>`).
--   Until that's done, the trigger below finds no secret in Vault and skips
--   the webhook call silently (see `IF v_secret IS NULL THEN RETURN NEW`) —
--   the app keeps working, push notifications just don't fire yet.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'push_webhook_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://lkdtffbltslyatnwxeoo.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object(
      'user_id',  NEW.user_id,
      'type',     NEW.type,
      'actor_id', NEW.actor_id,
      'data',     NEW.data
    )
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_push() FROM anon, authenticated;

CREATE TRIGGER tr_notifications_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push();
