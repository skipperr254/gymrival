-- ─── Harden functions added in migrations 033 and 035 ───────────────────────
--
-- The Supabase security advisor flagged two gaps versus this codebase's own
-- established pattern (migration 023's blanket REVOKE, and every other
-- SECURITY DEFINER/trusted function's SET search_path):
--
--   1. gym_checkin_day() (033) had no `SET search_path`, unlike every other
--      function in this schema — a mutable search_path lets a malicious
--      search_path (e.g. via session config) cause the function to resolve
--      unqualified identifiers to attacker-controlled objects. This function
--      has no unqualified identifiers today, so it's not currently
--      exploitable, but it should follow the same convention as every
--      sibling function regardless.
--
--   2. revert_checkin_xp() (035) only revoked EXECUTE from `anon,
--      authenticated`, not `PUBLIC` — its sibling award_checkin_xp()
--      correctly revokes from `PUBLIC, anon, authenticated` (023). A bare
--      REVOKE ... FROM anon does not remove a role's *inherited* EXECUTE via
--      the PUBLIC pseudo-role, so this trigger-only function (never meant to
--      be called directly) was still callable via
--      /rest/v1/rpc/revert_checkin_xp by any signed-in or anonymous caller.

CREATE OR REPLACE FUNCTION public.gym_checkin_day(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (date_trunc('day', ts AT TIME ZONE 'UTC'))::date;
$$;

REVOKE EXECUTE ON FUNCTION public.revert_checkin_xp() FROM PUBLIC, anon, authenticated;
