-- Add is_pro flag, streak counter, and friends count to profiles.
-- is_pro is toggled directly for now; real subscription logic comes later.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS streak        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS friends_count integer NOT NULL DEFAULT 0;
