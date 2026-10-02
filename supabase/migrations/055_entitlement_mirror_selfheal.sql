-- =============================================================================
-- 055_entitlement_mirror_selfheal.sql
-- Make `profiles.is_pro` self-correcting instead of write-once-and-hope.
-- =============================================================================
-- What happened
--   On 2026-10-02 the comped account was found with
--   `subscriptions.status = 'active'` (manual grant, no expiry) but
--   `profiles.is_pro = false`. The mirror had drifted: the subscription row had
--   not been written since 2026-08-31, so `tr_subscriptions_sync_is_pro` never
--   fired, which means something wrote `profiles` directly. The cause was not
--   determined — most likely a manual edit.
--
-- Why it matters more than the one row
--   `profiles.is_pro` is a denormalised mirror of `public.subscriptions`, and
--   it is what EVERY gate reads: the PR visibility trigger, the pr_videos
--   policy, and (from 3b/3c) messaging and compete. Until now it was only ever
--   written by a trigger on `subscriptions`. Any drift — manual edit, a
--   restore from backup, a bad migration — would silently mis-gate a paying
--   customer with nothing to detect or correct it.
--
--   A denormalised value with no reconciliation path is a latent outage. This
--   gives it one.
-- =============================================================================


-- ── 1. Repair the current drift ──────────────────────────────────────────────
UPDATE public.profiles p
   SET is_pro = d.should_be
  FROM (
    SELECT pr.id,
           COALESCE(public.subscription_is_active(s.status, s.current_period_end), false)
             AS should_be
      FROM public.profiles pr
      LEFT JOIN public.subscriptions s ON s.user_id = pr.id
  ) d
 WHERE d.id = p.id
   AND p.is_pro IS DISTINCT FROM d.should_be;


-- ── 2. Teach the hourly sweep to reconcile, not just expire ──────────────────
-- Previously this only flipped lapsed subscriptions to 'expired' and relied on
-- the trigger to propagate. Now it also re-derives every mirror, so any drift
-- from any cause heals within the hour.
--
-- Scheduled by migration 046 as the pg_cron job `refresh-expired-entitlements`.
-- Returns the number of rows it had to change — a non-zero return with no
-- expiries is a signal that something is writing `profiles.is_pro` directly.
CREATE OR REPLACE FUNCTION public.refresh_expired_entitlements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_expired  integer;
  v_repaired integer;
BEGIN
  -- Lapsed subscriptions nobody told us about (a dropped EXPIRATION webhook).
  WITH lapsed AS (
    UPDATE public.subscriptions s
       SET status = 'expired'
     WHERE s.current_period_end IS NOT NULL
       AND s.current_period_end <= now()
       AND s.status <> 'expired'
    RETURNING s.user_id
  )
  SELECT count(*) INTO v_expired FROM lapsed;

  -- Re-derive every mirror from the subscription table. Covers the rows the
  -- step above just expired, and any drift from outside the trigger path.
  WITH repaired AS (
    UPDATE public.profiles p
       SET is_pro = d.should_be
      FROM (
        SELECT pr.id,
               COALESCE(public.subscription_is_active(s.status, s.current_period_end), false)
                 AS should_be
          FROM public.profiles pr
          LEFT JOIN public.subscriptions s ON s.user_id = pr.id
      ) d
     WHERE d.id = p.id
       AND p.is_pro IS DISTINCT FROM d.should_be
    RETURNING p.id
  )
  SELECT count(*) INTO v_repaired FROM repaired;

  IF v_repaired > 0 THEN
    RAISE LOG 'refresh_expired_entitlements: repaired % profiles.is_pro mirror(s)', v_repaired;
  END IF;

  RETURN v_expired + v_repaired;
END;
$fn$;

REVOKE ALL ON FUNCTION public.refresh_expired_entitlements() FROM public, anon, authenticated;


-- ── 3. A read-only drift detector ────────────────────────────────────────────
-- For checking the invariant without mutating anything. Empty result = healthy.
CREATE OR REPLACE VIEW public.entitlement_mirror_drift AS
  SELECT p.id AS user_id,
         p.is_pro AS profile_mirror,
         s.provider,
         s.status,
         s.current_period_end,
         COALESCE(public.subscription_is_active(s.status, s.current_period_end), false)
           AS should_be_pro
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id
   WHERE p.is_pro IS DISTINCT FROM
         COALESCE(public.subscription_is_active(s.status, s.current_period_end), false);

COMMENT ON VIEW public.entitlement_mirror_drift IS
  'Rows where profiles.is_pro disagrees with public.subscriptions. Should always be empty; refresh_expired_entitlements() repairs it hourly.';

-- Service-role only: it exposes other users'' subscription state.
REVOKE ALL ON public.entitlement_mirror_drift FROM public, anon, authenticated;
