-- ─── Gym Check-Ins ────────────────────────────────────────────────────────────
--
-- Design notes:
--   - gyms is a public registry of fitness venues. Seeded with common chains;
--     users can add their own (created_by = their user_id). lat/lng are reserved
--     for future geo-based "nearby gyms" filtering — nullable for V1.
--
--   - gym_checkins records each user's visit to a gym. One active check-in per
--     user at a time is enforced via a partial UNIQUE index on
--     (user_id) WHERE checked_out_at IS NULL.
--
--   - checked_out_at is reserved for a future explicit check-out flow.
--     V1 uses "undo" (DELETE the row) within the same day.
--
--   - workout_log_id links a check-in to a workout log when the user starts
--     a workout after checking in (set at workout start, not check-in time).
--
--   - xp_awarded tracks whether the daily 25-XP reward fired for this row.
--     The AFTER INSERT trigger awards XP only for the first check-in of the
--     day (UTC) and then sets this flag so subsequent same-day check-ins are
--     ignored.
--
-- Future integrations:
--   - Challenges: count gym_checkins rows for "most visits this week" challenges
--   - AI Coach:   training frequency from gym_checkins + workout_logs
--   - Leaderboard: gym-level leaderboards (who visits most / lifts most at venue)
--   - Notifications: "Your friend X just checked in nearby!" via realtime
--   - Profile: check-in count badge / streak badges
--   - Geo: lat/lng + PostGIS for "gyms within 5 km" once location permission added
--
-- Performance note on RLS:
--   The "friends' check-ins visible" policy uses a correlated subquery against
--   friendships. This is fine for V1 (small friend lists). At scale, materialise
--   accepted friendships into a bi-directional lookup table and add a GIN index
--   on the user_ids array column.

-- ── 1. Gyms ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gyms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  address     TEXT,
  city        TEXT,
  country     TEXT,
  -- Reserved for future PostGIS / geo-filtering. NUMERIC chosen over FLOAT to
  -- avoid precision loss that would corrupt nearby-gym radius queries.
  lat         NUMERIC(9,6),
  lng         NUMERIC(9,6),
  -- Verified gyms are seeded or approved by admin; user-submitted start as false
  is_verified BOOLEAN     NOT NULL DEFAULT false,
  -- null = seeded/system gym; set for user-submitted gyms
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate gym names within the same city (case-insensitive).
-- Gyms without a city are not covered by this index — intentional so that
-- seed data (no city set) doesn't block user submissions with a named city.
CREATE UNIQUE INDEX IF NOT EXISTS gyms_name_city_unique
  ON public.gyms (lower(name), lower(city))
  WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS gyms_name_idx ON public.gyms (lower(name));

-- Future: CREATE INDEX gyms_location_idx ON public.gyms USING gist(ll_to_earth(lat, lng));

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- Everyone can browse gyms (needed to render the check-in gym picker)
CREATE POLICY "Gyms are readable by all authenticated users"
  ON public.gyms FOR SELECT TO authenticated
  USING (true);

-- Users can submit new gyms
CREATE POLICY "Users can submit gyms"
  ON public.gyms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Submitters can edit their own gyms; verified gyms are read-only for users
CREATE POLICY "Users can update own submitted gyms"
  ON public.gyms FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND is_verified = false)
  WITH CHECK (auth.uid() = created_by);

GRANT SELECT ON public.gyms TO authenticated;
GRANT INSERT, UPDATE ON public.gyms TO authenticated;

CREATE TRIGGER gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Gym check-ins ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gym_checkins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  gym_id          UUID        NOT NULL REFERENCES public.gyms(id)       ON DELETE RESTRICT,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Future: set when user explicitly checks out; NULL = still at gym / not tracked
  checked_out_at  TIMESTAMPTZ,
  -- Set after the user starts a workout during this visit (FK wired in migration 016 reservation)
  workout_log_id  UUID        REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  -- True after the daily 25-XP reward has been awarded for this check-in
  xp_awarded      BOOLEAN     NOT NULL DEFAULT false,
  -- Future: mood rating, session notes, etc.
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one active (non-checked-out) check-in per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS gym_checkins_one_active_per_user
  ON public.gym_checkins (user_id)
  WHERE checked_out_at IS NULL;

-- Weekly streak queries: user's check-ins ordered by date
CREATE INDEX IF NOT EXISTS gym_checkins_user_date_idx
  ON public.gym_checkins (user_id, checked_in_at DESC);

-- "Who's at this gym today?" aggregate (used by gym_today_checkin_counts RPC)
CREATE INDEX IF NOT EXISTS gym_checkins_gym_date_idx
  ON public.gym_checkins (gym_id, checked_in_at DESC);

-- Back-reference index for workout_log_id FK
CREATE INDEX IF NOT EXISTS gym_checkins_workout_log_idx
  ON public.gym_checkins (workout_log_id)
  WHERE workout_log_id IS NOT NULL;

ALTER TABLE public.gym_checkins ENABLE ROW LEVEL SECURITY;

-- Users can see their own check-ins and those of accepted friends.
-- This enables the "Friends Checked In" section in the UI.
CREATE POLICY "Users can see own and friends check-ins"
  ON public.gym_checkins FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = gym_checkins.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = gym_checkins.user_id)
        )
    )
  );

CREATE POLICY "Users can insert own check-ins"
  ON public.gym_checkins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
  ON public.gym_checkins FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own check-ins"
  ON public.gym_checkins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_checkins TO authenticated;

-- ── 3. Wire up the reserved FK on workout_logs ────────────────────────────────
--
-- Migration 016 added gym_checkin_id as a plain UUID column without a FK
-- (gym_checkins did not exist yet). Now that the table exists, add the
-- constraint. The DO block guards against re-running this migration in
-- environments that already have the constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workout_logs_gym_checkin_id_fkey'
      AND table_schema = 'public'
      AND table_name   = 'workout_logs'
  ) THEN
    ALTER TABLE public.workout_logs
      ADD CONSTRAINT workout_logs_gym_checkin_id_fkey
      FOREIGN KEY (gym_checkin_id) REFERENCES public.gym_checkins(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workout_logs_gym_checkin_idx
  ON public.workout_logs (gym_checkin_id)
  WHERE gym_checkin_id IS NOT NULL;

-- ── 4. XP trigger: first check-in of the day earns 25 XP ─────────────────────
--
-- Runs AFTER INSERT so the new row is visible in the table.
-- Awards XP only when no other check-in for the same user exists on the same
-- UTC calendar day. Uses date_trunc to define "same day" consistently.
-- The xp_awarded flag is set so downstream code / admin queries can audit
-- which check-in triggered the XP without re-running the date logic.

CREATE OR REPLACE FUNCTION public.award_checkin_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user already earned check-in XP today (UTC)
  IF NOT EXISTS (
    SELECT 1 FROM public.gym_checkins
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND checked_in_at >= date_trunc('day', NEW.checked_in_at AT TIME ZONE 'UTC')
      AND checked_in_at <  date_trunc('day', NEW.checked_in_at AT TIME ZONE 'UTC') + INTERVAL '1 day'
  ) THEN
    UPDATE public.profiles
    SET
      xp    = xp + 25,
      level = GREATEST(1, (xp + 25) / 500 + 1)
    WHERE id = NEW.user_id;

    UPDATE public.gym_checkins SET xp_awarded = true WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_checkin_xp() FROM anon, authenticated;

CREATE TRIGGER tr_gym_checkins_award_xp
  AFTER INSERT ON public.gym_checkins
  FOR EACH ROW EXECUTE FUNCTION public.award_checkin_xp();

-- ── 5. Aggregate RPC: today's check-in count per gym ─────────────────────────
--
-- Returns (gym_id, count) for all gyms that have at least one check-in today
-- (UTC day boundary). Runs as SECURITY DEFINER to bypass the row-level policy
-- that restricts check-in visibility to own + friends — the aggregate exposes
-- no personal data, only a per-venue count.
-- Used to populate the "X here today" badge on each gym card in the UI.

CREATE OR REPLACE FUNCTION public.gym_today_checkin_counts()
RETURNS TABLE(gym_id UUID, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gc.gym_id,
    COUNT(*)::BIGINT AS count
  FROM public.gym_checkins gc
  WHERE gc.checked_in_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
    AND gc.checked_in_at <  date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
  GROUP BY gc.gym_id;
$$;

REVOKE EXECUTE ON FUNCTION public.gym_today_checkin_counts() FROM anon;
GRANT  EXECUTE ON FUNCTION public.gym_today_checkin_counts() TO authenticated;

-- ── 6. Seed initial gym data ──────────────────────────────────────────────────
--
-- A starter set of well-known gym chains. No city/country set at this level
-- so they appear for all users regardless of location. Users can add their
-- own gym with a specific address/city when the submission UI is added.
-- created_by = NULL marks these as system/admin-seeded rows.

INSERT INTO public.gyms (name, is_verified, created_by) VALUES
  ('Basic-Fit',       true, NULL),
  ('Fit For Free',    true, NULL),
  ('Planet Fitness',  true, NULL),
  ('Gold''s Gym',     true, NULL),
  ('LA Fitness',      true, NULL),
  ('Anytime Fitness', true, NULL),
  ('24 Hour Fitness', true, NULL),
  ('Crunch Fitness',  true, NULL),
  ('Life Time Fitness', true, NULL),
  ('Olympus Gym',     true, NULL);
