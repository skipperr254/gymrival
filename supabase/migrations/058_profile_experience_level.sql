-- =============================================================================
-- 058_profile_experience_level.sql
-- B4: somewhere to put the onboarding quiz's third answer.
-- =============================================================================
-- The rebuilt onboarding asks three questions before sign-up. Two of them map
-- onto columns that already exist and feed the Mifflin-St Jeor calculation:
--
--   "What's your goal?"        -> profiles.diet_goal
--   "How often do you train?"  -> profiles.activity_level
--   "How long have you been lifting?"  -> (nothing)
--
-- The third had no home. Asking a question and throwing the answer away is
-- worse than not asking: the whole point of a quiz before sign-up is that the
-- answers come back as something personalised. So it gets a real column.
--
-- Not part of the TDEE maths — it exists to shape copy now and to make
-- experience-aware challenge matching possible later.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_level text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_experience_level_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_experience_level_check
      CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.experience_level IS
  'Self-reported lifting experience from the onboarding quiz. NULL for users who signed up before B4 or who skipped.';

-- `profiles` uses column-level GRANTs as its authorization boundary — table
-- level UPDATE was revoked in 024 and re-granted per column in 044. A new
-- user-editable column is invisible to the client until it is added here:
-- selecting or updating it would fail with "permission denied for column".
GRANT SELECT (experience_level) ON public.profiles TO authenticated;
GRANT UPDATE (experience_level) ON public.profiles TO authenticated;
