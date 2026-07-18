-- Add extended profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS gym       TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS goal      TEXT,
  ADD COLUMN IF NOT EXISTS bio       TEXT,
  ADD COLUMN IF NOT EXISTS quote     TEXT,
  ADD COLUMN IF NOT EXISTS xp        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level     INTEGER NOT NULL DEFAULT 1;

-- Allow all authenticated users to read any profile (for leaderboard / explore)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Keep update restricted to own profile
-- (policy "Users can update own profile" already exists from migration 001)

-- Grant table access to authenticated role
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Fix set_updated_at: pin search_path to prevent mutable search_path warning
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Revoke direct RPC access to handle_new_user (trigger only — not a public function)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
