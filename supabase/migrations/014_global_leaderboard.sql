-- 014_global_leaderboard.sql
-- Adds country_code to profiles and two RPC functions that power the global
-- leaderboard: global_leaderboard() for the paginated ranked list, and
-- my_global_rank() for the current user's own position even when outside
-- the visible page.
--
-- Ranking is by combined best bench + squat + deadlift PRs ("the big 3").
-- Users who have not logged any of the three lifts are excluded from the
-- ranked list (they appear as "unranked" in the app).

-- ─── Schema ───────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT;  -- ISO 3166-1 alpha-2, e.g. 'NL', 'US'

-- ─── global_leaderboard() ─────────────────────────────────────────────────────
-- Returns athletes ranked by their combined big-3 total.
-- Supports:
--   • pagination via p_limit / p_offset
--   • full-text search on username and full_name via p_search
--   • is_me flag so the client can highlight the current viewer's row
--
-- NOTE: ranks are computed over the *full* table before search/pagination is
-- applied, so a user's rank never changes based on the search filter.
--
-- Performance note: for very large datasets (10 k+ users) consider replacing
-- the personal_records scan with a materialized view refreshed by the
-- tr_personal_records_award_xp trigger.

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
    -- One row per user: best bench, squat, deadlift (0 when not logged)
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
    -- Join with profiles; exclude users with zero total so the list stays clean
    SELECT
      bp.user_id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.level,
      p.country_code,
      bp.bench_pr,
      bp.squat_pr,
      bp.deadlift_pr,
      (bp.bench_pr + bp.squat_pr + bp.deadlift_pr) AS total_kg
    FROM best_prs bp
    JOIN public.profiles p ON p.id = bp.user_id
    WHERE (bp.bench_pr + bp.squat_pr + bp.deadlift_pr) > 0
  ),
  ranked AS (
    -- RANK() gives tied users the same position (1, 2, 2, 4 …)
    SELECT
      s.*,
      RANK() OVER (ORDER BY s.total_kg DESC) AS rank
    FROM scored s
  )
  SELECT
    r.user_id,
    r.full_name,
    r.username,
    r.avatar_url,
    r.level,
    r.country_code,
    r.bench_pr,
    r.squat_pr,
    r.deadlift_pr,
    r.total_kg,
    r.rank,
    COALESCE((r.user_id = p_viewer_id), false) AS is_me
  FROM ranked r
  WHERE (
    p_search IS NULL
    OR p_search = ''
    OR r.username  ILIKE '%' || p_search || '%'
    OR r.full_name ILIKE '%' || p_search || '%'
  )
  -- Secondary sort by user_id for a stable, deterministic page order
  ORDER BY r.rank, r.user_id
  LIMIT  p_limit
  OFFSET p_offset
$$;

GRANT EXECUTE ON FUNCTION public.global_leaderboard(UUID, TEXT, INT, INT) TO authenticated;

-- ─── my_global_rank() ─────────────────────────────────────────────────────────
-- Returns a single row with the current user's global rank and big-3 stats.
-- Returns no rows when the user has not logged any big-3 lift.
-- Uses a COUNT approach that matches RANK() semantics:
--   rank = (number of users with strictly higher total) + 1

CREATE OR REPLACE FUNCTION public.my_global_rank(p_user_id UUID)
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
  WITH my_bests AS (
    -- Aggregate the three lifts for this user only
    SELECT
      COALESCE(MAX(CASE WHEN exercise_key = 'bench'    THEN value END), 0) AS bench_pr,
      COALESCE(MAX(CASE WHEN exercise_key = 'squat'    THEN value END), 0) AS squat_pr,
      COALESCE(MAX(CASE WHEN exercise_key = 'deadlift' THEN value END), 0) AS deadlift_pr
    FROM public.personal_records
    WHERE user_id = p_user_id
      AND exercise_key IN ('bench', 'squat', 'deadlift')
  ),
  my_total AS (
    SELECT bench_pr + squat_pr + deadlift_pr AS total
    FROM my_bests
  ),
  all_user_totals AS (
    -- Compute combined total for every user who has any big-3 PR
    SELECT
      user_id,
      COALESCE(MAX(CASE WHEN exercise_key = 'bench'    THEN value END), 0) +
      COALESCE(MAX(CASE WHEN exercise_key = 'squat'    THEN value END), 0) +
      COALESCE(MAX(CASE WHEN exercise_key = 'deadlift' THEN value END), 0) AS total
    FROM public.personal_records
    WHERE exercise_key IN ('bench', 'squat', 'deadlift')
    GROUP BY user_id
  ),
  my_rank AS (
    -- Count users who beat us to get our RANK()-compatible position
    SELECT (COUNT(*) + 1)::BIGINT AS rank
    FROM all_user_totals
    WHERE total > (SELECT total FROM my_total)
  )
  SELECT
    p_user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.level,
    p.country_code,
    mb.bench_pr,
    mb.squat_pr,
    mb.deadlift_pr,
    (mb.bench_pr + mb.squat_pr + mb.deadlift_pr) AS total_kg,
    mr.rank,
    TRUE
  FROM my_bests mb
  CROSS JOIN my_rank mr
  JOIN public.profiles p ON p.id = p_user_id
  -- Exclude users with no big-3 activity
  WHERE (mb.bench_pr + mb.squat_pr + mb.deadlift_pr) > 0
$$;

GRANT EXECUTE ON FUNCTION public.my_global_rank(UUID) TO authenticated;
