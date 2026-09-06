-- =============================================================================
-- 048_challenge_admin_completion_revoke_public.sql
-- Follow-up fix to 047: REVOKE EXECUTE ... FROM anon, authenticated does not
-- touch the implicit PUBLIC grant that CREATE FUNCTION issues by default.
-- anon/authenticated inherit EXECUTE through the PUBLIC pseudo-role, so
-- complete_expired_challenges() was still callable by anyone via
-- /rest/v1/rpc/complete_expired_challenges (confirmed via
-- information_schema.routine_privileges and flagged by the Supabase security
-- advisor as anon_security_definer_function_executable). Only pg_cron
-- (running outside PostgREST) needs to call this.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.complete_expired_challenges() FROM PUBLIC;
