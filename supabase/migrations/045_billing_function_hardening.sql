-- =============================================================================
-- 045_billing_function_hardening.sql
-- Follow-up to 044 — clears the advisories the new billing functions raised.
-- =============================================================================
-- Three findings, same class as the ones 031/032 fixed for the older functions:
--
--   1. `sync_profile_is_pro()` is SECURITY DEFINER and PUBLIC holds EXECUTE by
--      default, so PostgREST exposes it at /rest/v1/rpc/sync_profile_is_pro to
--      anon and authenticated alike. Postgres refuses to run a trigger function
--      called directly ("trigger functions can only be called as triggers"), so
--      this is not exploitable today — but it is a definer-rights function on
--      the public API surface, and that should never be true by accident.
--
--   2/3. `subscription_is_active()` and `touch_subscription_updated_at()` were
--      created without a pinned `search_path`, so a caller could resolve
--      `now()` or an operator through a schema of their choosing.
--
-- `refresh_expired_entitlements()` already had both handled in 044.
-- =============================================================================

ALTER FUNCTION public.subscription_is_active(text, timestamptz)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.touch_subscription_updated_at()
  SET search_path = pg_catalog, public;

-- Nothing outside the database calls any of these — they exist to serve
-- triggers and the reconcile sweep. Take them off the REST surface entirely.
REVOKE ALL ON FUNCTION public.sync_profile_is_pro()
  FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.touch_subscription_updated_at()
  FROM public, anon, authenticated;

REVOKE ALL ON FUNCTION public.subscription_is_active(text, timestamptz)
  FROM public, anon, authenticated;
