-- =============================================================================
-- 044_billing_entitlement_spine.sql
-- Phase 0 of the Pro rollout: make "Pro" a server-owned fact.
-- =============================================================================
-- Problem
--   `profiles.is_pro` has been in the client's column-level UPDATE grant since
--   024_column_grant_hardening.sql, explicitly marked "(placeholder)". Any
--   signed-in user can run
--       UPDATE profiles SET is_pro = true WHERE id = auth.uid();
--   and it succeeds — the RLS policy only checks the row, and the column is
--   granted. Harmless while Pro is a dev toggle; a revenue hole the moment a
--   paywall exists.
--
-- Fix
--   1. Revoke the grant. Nothing outside the database may write `is_pro` again.
--   2. Add `subscriptions` — one provider-agnostic row per user, written only
--      by the service role (i.e. the billing webhook edge function).
--   3. Add `billing_events` — an idempotency ledger. Providers retry; RevenueCat
--      in particular WILL resend an event, and without a dedupe key a retried
--      RENEWAL double-applies.
--   4. A trigger mirrors the subscription's derived entitlement onto
--      `profiles.is_pro`, which stays the single column every RLS policy and
--      gating RPC reads. Feature gates never need to know a provider exists.
--
--   `subscriptions` is deliberately not RevenueCat-shaped. Swapping providers
--   means writing a new webhook that fills the same row — no schema change, no
--   policy change, no client change.
-- =============================================================================


-- ── 1. Close the self-promotion hole ─────────────────────────────────────────
-- Re-grants the remaining legitimate columns explicitly rather than issuing a
-- bare REVOKE on is_pro, so this migration reads as the current full picture
-- of what a client may edit on `profiles` (024 + 042 + this one).

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  username,
  full_name,
  avatar_url,
  gym,
  weight_kg,
  height_cm,
  goal,
  bio,
  quote,
  country_code,
  expo_push_token,
  language,
  push_enabled,
  age,
  sex,
  activity_level,
  diet_goal,
  target_calories,
  target_protein_g,
  target_carbs_g,
  target_fat_g
) ON public.profiles TO authenticated;
-- Deliberately absent: is_pro, xp, level, role, streak, friends_count, id,
-- email, created_at, updated_at.


-- ── 2. subscriptions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 'revenuecat' today; 'manual' for comped/grandfathered access; a future
  -- provider slots in here without anything else in the app noticing.
  provider             text NOT NULL DEFAULT 'revenuecat',
  -- The provider's own id for this customer (RevenueCat's app_user_id). Kept so
  -- a webhook can resolve a user even if its payload omits our uuid.
  provider_customer_id text,

  entitlement          text NOT NULL DEFAULT 'pro',
  product_id           text,
  store                text CHECK (store IN ('app_store', 'play_store', 'promo', 'manual')),

  status               text NOT NULL CHECK (status IN (
                         'trialing', 'active', 'grace', 'billing_issue',
                         'cancelled', 'expired'
                       )),

  -- NULL = no expiry (a manual/comped grant). Access is checked against this,
  -- not against `status` alone: a CANCELLATION keeps access until it passes.
  current_period_end   timestamptz,
  will_renew           boolean NOT NULL DEFAULT false,
  is_sandbox           boolean NOT NULL DEFAULT false,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS
  'Server-owned entitlement truth, one row per user. Written only by the service role (billing webhook / reconcile edge function). Provider-agnostic by design so the billing vendor can be swapped without touching RLS, gates or the client.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_customer
  ON public.subscriptions (provider, provider_customer_id);

-- Sweeping for lapsed access (see refresh_expired_entitlements below) scans by
-- period end; without this it is a seq scan over every subscriber.
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- A user may read their own row and nothing else. No INSERT/UPDATE/DELETE
-- policy exists at all, and no such grant is issued — the service role bypasses
-- RLS, so the webhook still writes freely while `authenticated` cannot.
DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.subscriptions FROM authenticated, anon;
GRANT SELECT ON public.subscriptions TO authenticated;


-- ── 3. billing_events (idempotency ledger) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_events (
  -- The provider's own event id. PRIMARY KEY is the dedupe: a replayed webhook
  -- hits a unique violation, the handler swallows it and returns 200.
  event_id     text PRIMARY KEY,
  provider     text NOT NULL,
  type         text NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload      jsonb,
  received_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_events IS
  'Append-only idempotency ledger for billing webhooks. Service-role only — raw provider payloads are never exposed to clients.';

CREATE INDEX IF NOT EXISTS idx_billing_events_user
  ON public.billing_events (user_id, received_at DESC);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- Intentionally zero policies: RLS on with no policy denies every non-service
-- role outright.
REVOKE ALL ON public.billing_events FROM authenticated, anon;


-- ── 4. Derived entitlement + mirror onto profiles.is_pro ─────────────────────

-- The single definition of "does this row grant access right now".
--
-- 'cancelled' still grants: auto-renew is off, but the user paid through
-- current_period_end. Revoking on CANCELLATION is the classic billing bug.
-- 'billing_issue' / 'grace' still grant: involuntary churn is a large share of
-- Play cancellations, and the store is still retrying the charge.
-- 'expired' never grants.
CREATE OR REPLACE FUNCTION public.subscription_is_active(
  p_status text,
  p_period_end timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT p_status IN ('trialing', 'active', 'grace', 'billing_issue', 'cancelled')
     AND (p_period_end IS NULL OR p_period_end > now());
$fn$;

CREATE OR REPLACE FUNCTION public.sync_profile_is_pro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user_id uuid;
  v_is_pro  boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_is_pro  := false;
  ELSE
    v_user_id := NEW.user_id;
    v_is_pro  := public.subscription_is_active(NEW.status, NEW.current_period_end);
  END IF;

  UPDATE public.profiles
     SET is_pro = v_is_pro
   WHERE id = v_user_id
     AND is_pro IS DISTINCT FROM v_is_pro;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_subscriptions_sync_is_pro ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_sync_is_pro
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_is_pro();

CREATE OR REPLACE FUNCTION public.touch_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_subscriptions_touch ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_touch
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_updated_at();


-- Entitlement expiry is time-based, but the trigger above only fires on writes.
-- If an EXPIRATION webhook is ever dropped, `is_pro` would stay true past the
-- period end. This sweep is the backstop; Phase 1 schedules it (pg_cron) and
-- adds an on-demand reconcile against the provider's REST API.
CREATE OR REPLACE FUNCTION public.refresh_expired_entitlements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_count integer;
BEGIN
  WITH lapsed AS (
    UPDATE public.subscriptions s
       SET status = 'expired'
     WHERE s.current_period_end IS NOT NULL
       AND s.current_period_end <= now()
       AND s.status <> 'expired'
    RETURNING s.user_id
  )
  SELECT count(*) INTO v_count FROM lapsed;

  RETURN v_count;
END;
$fn$;

REVOKE ALL ON FUNCTION public.refresh_expired_entitlements() FROM public, anon, authenticated;


-- ── 5. Grandfather existing dev-toggle Pro accounts ──────────────────────────
-- Anyone currently flagged Pro got there through the dev toggle. Rather than
-- silently downgrading them (and breaking a demo account mid-review), give
-- them a non-expiring manual grant. Revoke by deleting the row — the trigger
-- clears is_pro automatically.

INSERT INTO public.subscriptions (
  user_id, provider, entitlement, status, store, current_period_end, will_renew
)
SELECT p.id, 'manual', 'pro', 'active', 'manual', NULL, false
  FROM public.profiles p
 WHERE p.is_pro = true
ON CONFLICT (user_id) DO NOTHING;

-- Any profile flagged Pro without a backing subscription row is now, by
-- definition, unauthorized. (The INSERT above covers every current one; this
-- catches rows written between then and now, and makes the invariant explicit.)
UPDATE public.profiles p
   SET is_pro = false
 WHERE p.is_pro = true
   AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id);
