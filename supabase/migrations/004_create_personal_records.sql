-- Personal records — one row per PR entry per user per exercise
CREATE TABLE IF NOT EXISTS public.personal_records (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_key TEXT         NOT NULL REFERENCES public.exercise_types(key),
  value        NUMERIC(8,2) NOT NULL,
  unit         TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read PRs (leaderboard requires cross-user reads)
CREATE POLICY "Authenticated users can read all PRs"
  ON public.personal_records FOR SELECT
  TO authenticated
  USING (true);

-- Write access restricted to own records
CREATE POLICY "Users can insert own PRs"
  ON public.personal_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PRs"
  ON public.personal_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own PRs"
  ON public.personal_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
