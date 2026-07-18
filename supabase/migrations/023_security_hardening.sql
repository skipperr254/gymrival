-- =============================================================================
-- 023_security_hardening.sql
-- Phase 4: Security hardening
-- =============================================================================
-- Goals:
--   (a) Block anon/public from calling trigger/internal SECURITY DEFINER fns
--   (b) Keep the 5 legitimate client RPCs callable by authenticated only
--   (c) Pin search_path on all SECURITY DEFINER functions (+ sync_friends_count)
--   (d) Replace broad pr-videos SELECT policy with owner-scoped one
-- =============================================================================


-- ---------------------------------------------------------------------------
-- (a) Trigger / internal functions — revoke from PUBLIC, anon, authenticated
--     These fire via DML triggers; REVOKE does not break them.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.award_challenge_xp()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_checkin_xp()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_pr_xp()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_video_xp()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_workout_xp()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_friend_pr_notification()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_friendship_notification()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_message_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_pr_liked_notification()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_new_message()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_challenge_baseline()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_challenge_scores()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_friends_count()              FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------------
-- (b) Legitimate client RPCs — revoke anon/PUBLIC, keep authenticated
--     Signatures from pg_proc (defaults stripped for REVOKE/GRANT).
-- ---------------------------------------------------------------------------

-- global_leaderboard(p_viewer_id uuid, p_search text, p_limit integer, p_offset integer)
REVOKE EXECUTE ON FUNCTION public.global_leaderboard(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.global_leaderboard(uuid, text, integer, integer) TO authenticated;

-- my_global_rank(p_user_id uuid)
REVOKE EXECUTE ON FUNCTION public.my_global_rank(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_global_rank(uuid) TO authenticated;

-- active_challenges_for_user(p_user_id uuid)
REVOKE EXECUTE ON FUNCTION public.active_challenges_for_user(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.active_challenges_for_user(uuid) TO authenticated;

-- challenge_leaderboard(p_challenge_id uuid, p_viewer_id uuid)
REVOKE EXECUTE ON FUNCTION public.challenge_leaderboard(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.challenge_leaderboard(uuid, uuid) TO authenticated;

-- gym_today_checkin_counts()
REVOKE EXECUTE ON FUNCTION public.gym_today_checkin_counts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.gym_today_checkin_counts() TO authenticated;


-- ---------------------------------------------------------------------------
-- (c) Pin search_path = public, pg_temp on all SECURITY DEFINER functions
--     and on sync_friends_count (fixes function_search_path_mutable warning).
--     Functions that already have search_path=public get pg_temp added.
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.award_challenge_xp()              SET search_path = public, pg_temp;
ALTER FUNCTION public.award_checkin_xp()                SET search_path = public, pg_temp;
ALTER FUNCTION public.award_pr_xp()                     SET search_path = public, pg_temp;
ALTER FUNCTION public.award_video_xp()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.award_workout_xp()                SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_friend_pr_notification()   SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_friendship_notification()  SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_message_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()                 SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_pr_liked_notification()    SET search_path = public, pg_temp;
ALTER FUNCTION public.on_new_message()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_challenge_baseline()          SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_challenge_scores()         SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_friends_count()              SET search_path = public, pg_temp;
ALTER FUNCTION public.global_leaderboard(uuid, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.my_global_rank(uuid)              SET search_path = public, pg_temp;
ALTER FUNCTION public.active_challenges_for_user(uuid)  SET search_path = public, pg_temp;
ALTER FUNCTION public.challenge_leaderboard(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.gym_today_checkin_counts()        SET search_path = public, pg_temp;


-- ---------------------------------------------------------------------------
-- (d) Tighten pr-videos SELECT policy
--     The bucket is PUBLIC — video playback uses getPublicUrl() which needs
--     no SELECT policy. The old broad policy let any authenticated user
--     enumerate ALL files. Replace it with an owner-scoped policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS pr_videos_storage_select_auth ON storage.objects;

CREATE POLICY pr_videos_storage_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pr-videos'
    AND split_part(name, '/'::text, 1) = (auth.uid())::text
  );
