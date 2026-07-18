-- ─── Training Programs, Sessions, and Workout Logs ─────────────────────────
--
-- Design notes:
--   - training_programs groups sessions (e.g., "Push/Pull/Legs"). Optional for
--     V1 — sessions can exist without a program and be lazily attached later.
--   - training_sessions are individual workout days (e.g., "Push Day").
--     day_of_week: 0=Monday … 6=Sunday; NULL = floating/unscheduled.
--   - session_exercises store the planned exercises with sets/reps/weight.
--     exercise_key is a nullable FK to exercise_types — populated when the
--     exercise matches a known type, enabling future PR/leaderboard correlation.
--     exercise_name is always set as human-readable display text.
--   - workout_logs record completed workout instances, including duration and
--     set progress. XP is awarded via trigger on completion.
--   - workout_log_sets record per-set detail (reps + weight actually used).
--     Designed for future active-workout tracking and PR detection during sets.
--     gym_checkin_id is a reserved column for future gym_checkins FK linkage.
--
-- Future integrations:
--   - Challenges: can aggregate workout_logs for weekly volume challenges
--   - AI Coach: reads training_sessions + workout_logs for personalised advice
--   - Streaks: derived from workout_logs.completed_at frequency
--   - Social feed: workout completions can be shared as feed posts
--   - PR detection: workout_log_sets.exercise_key + weight_used vs personal_records

-- ── 1. Training programs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_programs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one active program per user
CREATE UNIQUE INDEX IF NOT EXISTS training_programs_one_active_per_user
  ON public.training_programs (user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS training_programs_user_idx
  ON public.training_programs (user_id);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own programs"
  ON public.training_programs
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;

CREATE TRIGGER training_programs_updated_at
  BEFORE UPDATE ON public.training_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Training sessions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID        REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  day_of_week SMALLINT    CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS training_sessions_user_idx
  ON public.training_sessions (user_id, sort_order);

CREATE INDEX IF NOT EXISTS training_sessions_program_idx
  ON public.training_sessions (program_id);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.training_sessions
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;

CREATE TRIGGER training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Session exercises ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_exercises (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID         NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Optional link to a known exercise type (used for PR correlation)
  exercise_key   TEXT         REFERENCES public.exercise_types(key) ON DELETE SET NULL,
  exercise_name  TEXT         NOT NULL,
  sets           SMALLINT     NOT NULL DEFAULT 3 CHECK (sets > 0),
  -- TEXT to support ranges ("8-10"), AMRAP, etc.
  reps           TEXT         NOT NULL DEFAULT '10',
  -- NULL = unspecified; 0 = bodyweight
  target_weight  NUMERIC(8,2) CHECK (target_weight IS NULL OR target_weight >= 0),
  sort_order     INT          NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_exercises_session_idx
  ON public.session_exercises (session_id, sort_order);

ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session exercises"
  ON public.session_exercises
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_exercises TO authenticated;

CREATE TRIGGER session_exercises_updated_at
  BEFORE UPDATE ON public.session_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. Workout logs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workout_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id       UUID        REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  -- Reserved for future gym_checkins FK (table does not exist yet)
  gym_checkin_id   UUID,
  -- Snapshot of the session name at log time (survives session edits/deletes)
  session_name     TEXT        NOT NULL,
  duration_seconds INT         CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  sets_completed   INT         NOT NULL DEFAULT 0,
  total_sets       INT         NOT NULL DEFAULT 0,
  notes            TEXT,
  is_complete      BOOLEAN     NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_logs_user_date_idx
  ON public.workout_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workout_logs_session_idx
  ON public.workout_logs (session_id, created_at DESC);

-- Partial index for streak/history queries — only completed workouts
CREATE INDEX IF NOT EXISTS workout_logs_completed_user_idx
  ON public.workout_logs (user_id, completed_at DESC)
  WHERE is_complete = true;

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workout logs"
  ON public.workout_logs
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;

-- ── 5. Workout log sets ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workout_log_sets (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id      UUID         NOT NULL REFERENCES public.workout_logs(id)    ON DELETE CASCADE,
  session_exercise_id UUID         REFERENCES public.session_exercises(id) ON DELETE SET NULL,
  user_id             UUID         NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  -- Nullable — set if exercise maps to a known type (enables PR detection)
  exercise_key        TEXT         REFERENCES public.exercise_types(key) ON DELETE SET NULL,
  exercise_name       TEXT         NOT NULL,
  set_number          SMALLINT     NOT NULL CHECK (set_number > 0),
  reps_completed      SMALLINT     CHECK (reps_completed IS NULL OR reps_completed >= 0),
  weight_used         NUMERIC(8,2) CHECK (weight_used IS NULL OR weight_used >= 0),
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_log_sets_log_idx
  ON public.workout_log_sets (workout_log_id, set_number);

-- Enables future "max weight for exercise across all workouts" queries
CREATE INDEX IF NOT EXISTS workout_log_sets_user_exercise_idx
  ON public.workout_log_sets (user_id, exercise_key, created_at DESC);

ALTER TABLE public.workout_log_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workout log sets"
  ON public.workout_log_sets
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_log_sets TO authenticated;

-- ── 6. XP trigger for completed workouts ─────────────────────────────────────
--
-- Awards 75 XP when is_complete first transitions to true.
-- Uses the same level formula as PR XP: level = GREATEST(1, xp / 500 + 1).
-- Distinct from PR XP (50 XP) and video XP (50 XP) — separate reward category.

CREATE OR REPLACE FUNCTION public.award_workout_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_complete = true AND (OLD.is_complete IS DISTINCT FROM true) THEN
    UPDATE public.profiles
    SET
      xp    = xp + 75,
      level = GREATEST(1, (xp + 75) / 500 + 1)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_workout_xp() FROM anon, authenticated;

CREATE TRIGGER tr_workout_logs_award_xp
  AFTER UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.award_workout_xp();
