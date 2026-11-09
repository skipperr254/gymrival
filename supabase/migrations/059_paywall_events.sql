-- =============================================================================
-- 059_paywall_events.sql
-- B5: find out which of the eight paywall placements actually earns its keep.
-- =============================================================================
-- RevenueCat tells you WHAT was bought. It cannot tell you WHICH prompt earned
-- it — the purchase arrives with no memory of whether the user tapped "publish
-- this PR", hit the leaderboard wall, or wandered in from Settings. Without
-- this table, tuning placement is guesswork forever.
--
-- No new SDK. One table, one thin client helper, written fire-and-forget.
--
-- `impression_id` is what makes this a funnel rather than a pile of counters.
-- Every presentation of the paywall generates one, and every event from that
-- presentation carries it — so "shown" can be joined to its own outcome and
-- you get conversion per impression, not just totals that drift apart.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.paywall_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One id per presentation of the paywall; shared by every event it produces.
  impression_id uuid NOT NULL,

  -- SET NULL, not CASCADE: deleting an account should remove the personal
  -- link without silently rewriting historical conversion rates.
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Which of the eight placements opened it. Free text rather than an enum so
  -- adding a placement is a client-only change; the values are the
  -- PaywallTrigger union in constants/entitlements.ts.
  trigger       text NOT NULL,

  event         text NOT NULL CHECK (event IN (
                  'shown',
                  'dismissed',
                  'purchase_started',
                  'purchase_completed',
                  'purchase_cancelled',
                  'purchase_failed',
                  'restore_completed',
                  'restore_empty'
                )),

  -- Which plan the user had selected at the time, where it applies.
  plan_id       text,
  product_id    text,
  platform      text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.paywall_events IS
  'Paywall funnel telemetry. Insert-only from the client; join on impression_id to turn events into conversion rates. See the paywall_funnel view.';

CREATE INDEX IF NOT EXISTS idx_paywall_events_impression
  ON public.paywall_events (impression_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_trigger_event
  ON public.paywall_events (trigger, event);
CREATE INDEX IF NOT EXISTS idx_paywall_events_created
  ON public.paywall_events (created_at DESC);

ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;

-- Insert-only, and only as yourself. There is deliberately no SELECT policy:
-- a user has no reason to read the funnel, and the table would otherwise let
-- one account enumerate another's upgrade behaviour.
DROP POLICY IF EXISTS "paywall_events_insert_own" ON public.paywall_events;
CREATE POLICY "paywall_events_insert_own"
  ON public.paywall_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.paywall_events FROM authenticated, anon;
GRANT INSERT ON public.paywall_events TO authenticated;


-- ── The question this table exists to answer ─────────────────────────────────
-- Conversion per placement. Service-role only — it aggregates across users.
CREATE OR REPLACE VIEW public.paywall_funnel AS
  SELECT
    e.trigger,
    count(*) FILTER (WHERE e.event = 'shown')              AS impressions,
    count(*) FILTER (WHERE e.event = 'purchase_started')   AS purchases_started,
    count(*) FILTER (WHERE e.event = 'purchase_completed') AS purchases_completed,
    count(*) FILTER (WHERE e.event = 'dismissed')          AS dismissals,
    ROUND(
      100.0 * count(*) FILTER (WHERE e.event = 'purchase_completed')
            / NULLIF(count(*) FILTER (WHERE e.event = 'shown'), 0),
      1
    ) AS conversion_pct,
    min(e.created_at) AS first_seen,
    max(e.created_at) AS last_seen
  FROM public.paywall_events e
  GROUP BY e.trigger
  ORDER BY impressions DESC;

COMMENT ON VIEW public.paywall_funnel IS
  'Conversion per paywall placement. Service-role only: aggregates across users.';

REVOKE ALL ON public.paywall_funnel FROM public, anon, authenticated;
