-- =============================================================================
-- 057_compete_gate.sql
-- B3c: free users see the top of the global board and their own rank.
--      Depth, search and creating challenges are Pro.
-- =============================================================================
-- What free keeps
--   The Rivals (friends) board in full, their OWN global rank via
--   my_global_rank() — untouched below — and the top 10 of the global board.
--   Seeing "you are #847" while only the top 10 is readable is the whole
--   proposition: there is something specific they cannot see.
--
--   Free users also still RANK on the board. Their private PRs count (the
--   function is SECURITY DEFINER and reads past the 054 visibility policy by
--   design). A leaderboard that only contained paying users would be nearly
--   empty, and the board is what Pro is sold against.
--
-- Clamping, not filtering
--   The clamp is applied inside the function so the rows simply are not
--   returned. A patched client gains nothing — there is no hidden payload to
--   un-blur. The blurred rows the app draws are placeholders with no data in
--   them.
--
-- The row cap is mirrored client-side as FREE_LIMITS.globalLeaderboardRows in
-- constants/entitlements.ts. Change both together.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.global_leaderboard(
  p_viewer_id  UUID    DEFAULT NULL,
  p_search     TEXT    DEFAULT NULL,
  p_limit      INT     DEFAULT 50,
  p_offset     INT     DEFAULT 0
)
RETURNS TABLE (
  user_id      UUID,
  full_name    TEXT,
  username     TEXT,
  avatar_url   TEXT,
  level        INT,
  country_code TEXT,
  bench_pr     NUMERIC,
  squat_pr     NUMERIC,
  deadlift_pr  NUMERIC,
  total_kg     NUMERIC,
  rank         BIGINT,
  is_me        BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH best_prs AS (
    SELECT
      pr.user_id,
      COALESCE(MAX(CASE WHEN pr.exercise_key = 'bench'    THEN pr.value END), 0) AS bench_pr,
      COALESCE(MAX(CASE WHEN pr.exercise_key = 'squat'    THEN pr.value END), 0) AS squat_pr,
      COALESCE(MAX(CASE WHEN pr.exercise_key = 'deadlift' THEN pr.value END), 0) AS deadlift_pr
    FROM public.personal_records pr
    WHERE pr.exercise_key IN ('bench', 'squat', 'deadlift')
    GROUP BY pr.user_id
  ),
  scored AS (
    SELECT
      bp.user_id, p.full_name, p.username, p.avatar_url, p.level, p.country_code,
      bp.bench_pr, bp.squat_pr, bp.deadlift_pr,
      (bp.bench_pr + bp.squat_pr + bp.deadlift_pr) AS total_kg
    FROM best_prs bp
    JOIN public.profiles p ON p.id = bp.user_id
    WHERE (bp.bench_pr + bp.squat_pr + bp.deadlift_pr) > 0
  ),
  ranked AS (
    SELECT s.*, RANK() OVER (ORDER BY s.total_kg DESC) AS rank
    FROM scored s
  )
  SELECT
    r.user_id, r.full_name, r.username, r.avatar_url, r.level, r.country_code,
    r.bench_pr, r.squat_pr, r.deadlift_pr, r.total_kg, r.rank,
    COALESCE((r.user_id = p_viewer_id), false) AS is_me
  FROM ranked r
  WHERE (
    -- Search is Pro. For a free viewer the predicate collapses to TRUE, so
    -- they get the unfiltered top of the board rather than an empty result.
    NOT public.is_pro_user(auth.uid())
    OR p_search IS NULL
    OR p_search = ''
    OR r.username  ILIKE '%' || p_search || '%'
    OR r.full_name ILIKE '%' || p_search || '%'
  )
  ORDER BY r.rank, r.user_id
  -- Entitlement is read from auth.uid(), never from p_viewer_id: that
  -- parameter is caller-supplied and only drives the is_me flag, so keying
  -- the clamp off it would let a free client pass a Pro user's id and read
  -- the whole board.
  LIMIT (
    CASE WHEN public.is_pro_user(auth.uid())
         THEN GREATEST(COALESCE(p_limit, 50), 1)
         ELSE LEAST(COALESCE(p_limit, 50), 10)
    END
  )
  OFFSET (
    CASE WHEN public.is_pro_user(auth.uid())
         THEN GREATEST(COALESCE(p_offset, 0), 0)
         ELSE 0
    END
  )
$$;

GRANT EXECUTE ON FUNCTION public.global_leaderboard(UUID, TEXT, INT, INT) TO authenticated;


-- ── Creating a friend challenge is Pro ───────────────────────────────────────
-- Joining one you were invited to stays free: the invite comes from a Pro
-- user, and a challenge with no opponent is worth nothing to them.
CREATE OR REPLACE FUNCTION public.create_friend_challenge(
  p_metric       TEXT,
  p_exercise_key TEXT,
  p_title        TEXT,
  p_description  TEXT,
  p_prize_label  TEXT,
  p_ends_at      TIMESTAMPTZ,
  p_invitee_id   UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id   UUID := auth.uid();
  v_challenge_id UUID;
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Raised with a stable, machine-readable message so the client can turn it
  -- into a paywall rather than a generic error toast. SQLSTATE 42501 is
  -- insufficient_privilege.
  IF NOT public.is_pro_user(v_creator_id) THEN
    RAISE EXCEPTION 'pro_required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.challenges (
    type, scope, metric, exercise_key, title, description, prize_label,
    starts_at, ends_at, created_by, status
  ) VALUES (
    'friend', 'direct', p_metric, p_exercise_key, p_title, p_description, p_prize_label,
    NOW(), p_ends_at, v_creator_id, 'active'
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.challenge_participants (challenge_id, user_id)
  VALUES (v_challenge_id, v_creator_id);

  INSERT INTO public.challenge_invitations (challenge_id, inviter_id, invitee_id)
  VALUES (v_challenge_id, v_creator_id, p_invitee_id);

  RETURN v_challenge_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_friend_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_friend_challenge(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) TO authenticated;
