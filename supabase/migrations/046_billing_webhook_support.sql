-- =============================================================================
-- 046_billing_webhook_support.sql
-- Phase 1: what the RevenueCat webhook + reconcile edge functions need.
-- =============================================================================

-- ── 1. Out-of-order webhook guard ────────────────────────────────────────────
-- Providers do not promise ordered delivery. Without this, a delayed RENEWAL
-- arriving after an EXPIRATION would quietly re-grant a lapsed subscriber.
-- The webhook handler only applies an event whose timestamp is newer than the
-- last one it applied for that user; older ones are ledgered and ignored.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

COMMENT ON COLUMN public.subscriptions.last_event_at IS
  'Provider timestamp of the most recent event applied to this row. The webhook skips anything older.';


-- ── 2. Scheduled expiry sweep ────────────────────────────────────────────────
-- `refresh_expired_entitlements()` (migration 044) is the backstop for a
-- dropped EXPIRATION webhook. Hourly is plenty: the worst case is a lapsed
-- subscriber keeping Pro for up to an hour past period end, and the app also
-- re-reads the row on every foreground.
--
-- pg_cron is preinstalled on Supabase (schema pg_catalog). `cron.schedule` with
-- an existing job name replaces it, so this is safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-expired-entitlements',
  '17 * * * *',                       -- hourly, off the top of the hour
  $$ SELECT public.refresh_expired_entitlements(); $$
);
