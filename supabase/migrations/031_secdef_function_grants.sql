-- 031_secdef_function_grants.sql
--
-- Locks down EXECUTE on SECURITY DEFINER functions. By default Postgres grants
-- EXECUTE to PUBLIC, which means these definer functions were reachable by the
-- `anon` role (and, for the trigger helper, by any signed-in user) via the
-- PostgREST `/rpc/` endpoint. Resolves the `*_security_definer_function_executable`
-- security advisories.
--
-- Policy:
--   * App-facing RPCs — callable only by signed-in users. Revoke from PUBLIC +
--     anon, (re)grant to authenticated.
--   * notify_push() — a trigger helper that must never be called directly.
--     Revoke from everyone except the trigger's execution context
--     (service_role / table owner retain access via ownership).

-- ── App-facing RPCs: authenticated only ──────────────────────────────────────
revoke execute on function public.active_challenges_for_user(uuid, text) from public, anon;
grant  execute on function public.active_challenges_for_user(uuid, text) to authenticated;

revoke execute on function public.challenge_leaderboard(uuid, uuid) from public, anon;
grant  execute on function public.challenge_leaderboard(uuid, uuid) to authenticated;

revoke execute on function public.global_leaderboard(uuid, text, integer, integer) from public, anon;
grant  execute on function public.global_leaderboard(uuid, text, integer, integer) to authenticated;

revoke execute on function public.gym_today_checkin_counts() from public, anon;
grant  execute on function public.gym_today_checkin_counts() to authenticated;

revoke execute on function public.my_global_rank(uuid) from public, anon;
grant  execute on function public.my_global_rank(uuid) to authenticated;

-- ── Trigger helper: no direct callers ────────────────────────────────────────
revoke execute on function public.notify_push() from public, anon, authenticated;
