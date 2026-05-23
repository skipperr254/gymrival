-- Indexes for common personal_records query patterns

-- Best PR per exercise for a given user (profile screen, rivals leaderboard)
CREATE INDEX IF NOT EXISTS pr_user_exercise_value_idx
  ON public.personal_records (user_id, exercise_key, value DESC);

-- Full history for a user ordered newest-first (PR history screen, social feed)
CREATE INDEX IF NOT EXISTS pr_user_created_idx
  ON public.personal_records (user_id, created_at DESC);

-- Best PR per exercise across all users (global leaderboard)
CREATE INDEX IF NOT EXISTS pr_exercise_value_idx
  ON public.personal_records (exercise_key, value DESC);

-- Award 50 XP every time a PR row is inserted.
-- Level recalculates in the same update: 500 XP = 1 level (level 1 at 0 XP).
CREATE OR REPLACE FUNCTION public.award_pr_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    xp    = xp + 50,
    level = GREATEST(1, (xp + 50) / 500 + 1)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Revoke public RPC access — this function is trigger-only
REVOKE EXECUTE ON FUNCTION public.award_pr_xp() FROM anon, authenticated;

CREATE TRIGGER tr_personal_records_award_xp
  AFTER INSERT ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.award_pr_xp();
