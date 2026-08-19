-- ─── Nutrition tracking: profile TDEE inputs, My Foods, meal logs ──────────
--
-- Design notes:
--   - `age` is a plain integer, not a date of birth — no date-picker
--     dependency exists in the app yet, and this mirrors the existing plain
--     numeric-input pattern already used for weight_kg/height_cm.
--   - `sex`/`activity_level`/`diet_goal` are structured TDEE inputs, distinct
--     from the free-text `goal` column (user-authored prose from onboarding).
--   - target_calories/target_protein_g/target_carbs_g/target_fat_g are
--     nullable overrides: NULL = "use the calculated Mifflin-St Jeor value"
--     (see lib/nutrition.ts), non-null = explicit user override.
--   - `foods` is a private per-user reusable list ("My Foods"). `meal_logs`
--     snapshots name+macros at log time (same rationale as
--     workout_logs.session_name) so editing/deleting a saved food never
--     changes historical log entries.
--   - No XP trigger — nutrition tracking is a wellness feature, not part of
--     the competitive/leaderboard XP economy.

-- ── 1. Profile TDEE inputs + target overrides ───────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age SMALLINT CHECK (age IS NULL OR age BETWEEN 13 AND 100),
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (
    activity_level IS NULL OR activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  ADD COLUMN IF NOT EXISTS diet_goal TEXT CHECK (
    diet_goal IS NULL OR diet_goal IN ('lose', 'maintain', 'gain')
  ),
  ADD COLUMN IF NOT EXISTS target_calories INT CHECK (target_calories IS NULL OR target_calories >= 0),
  ADD COLUMN IF NOT EXISTS target_protein_g INT CHECK (target_protein_g IS NULL OR target_protein_g >= 0),
  ADD COLUMN IF NOT EXISTS target_carbs_g INT CHECK (target_carbs_g IS NULL OR target_carbs_g >= 0),
  ADD COLUMN IF NOT EXISTS target_fat_g INT CHECK (target_fat_g IS NULL OR target_fat_g >= 0);

-- ── 2. My Foods ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.foods (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  serving_label TEXT,
  calories      NUMERIC(8,2) NOT NULL CHECK (calories >= 0),
  protein_g     NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g       NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g         NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS foods_user_name_idx
  ON public.foods (user_id, name);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own foods"
  ON public.foods
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;

CREATE TRIGGER foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Meal logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Nullable: an ad-hoc entry need not be saved to My Foods
  food_id     UUID        REFERENCES public.foods(id) ON DELETE SET NULL,
  -- Snapshot at log time — survives the source food being edited/deleted
  name        TEXT        NOT NULL,
  calories    NUMERIC(8,2) NOT NULL CHECK (calories >= 0),
  protein_g   NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g     NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g       NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
  meal_type   TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_logs_user_logged_idx
  ON public.meal_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS meal_logs_food_idx
  ON public.meal_logs (food_id);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal logs"
  ON public.meal_logs
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_logs TO authenticated;
