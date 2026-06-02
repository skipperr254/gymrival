-- 022_add_push_token.sql
-- Stores each device's Expo push token so the Edge Function can deliver notifications

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
