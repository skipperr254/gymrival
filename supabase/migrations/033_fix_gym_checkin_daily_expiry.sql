-- ─── Fix: gym check-in never expires ────────────────────────────────────────
--
-- Bug: gym_checkins_one_active_per_user (migration 017) enforces "at most one
-- row with checked_out_at IS NULL, per user, ever" — because checked_out_at
-- is reserved for a still-deferred explicit check-out flow and is never set
-- anywhere in the app. In practice this means a user can check in at most
-- once for the lifetime of their account without first tapping
-- "Undo Check-In": the daily streak feature is unusable past day one.
--
-- Fix: replace the "one active, ever" constraint with "one check-in per user
-- per UTC calendar day", matching the day boundary already used by
-- award_checkin_xp() and gym_today_checkin_counts(). checked_out_at is left
-- in place, still unused, for the still-deferred future check-out flow.

-- Index expressions must be IMMUTABLE. `... AT TIME ZONE 'UTC'` on a
-- TIMESTAMPTZ is only ever STABLE per Postgres's own volatility catalog (it
-- depends on the timezone catalog in general), but UTC specifically has no
-- DST/offset rules that can change, so wrapping it in our own function and
-- declaring that IMMUTABLE is safe here and is the standard workaround for
-- this exact case.
CREATE OR REPLACE FUNCTION public.gym_checkin_day(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('day', ts AT TIME ZONE 'UTC'))::date;
$$;

DROP INDEX IF EXISTS public.gym_checkins_one_active_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS gym_checkins_one_per_user_per_day
  ON public.gym_checkins (user_id, public.gym_checkin_day(checked_in_at));
