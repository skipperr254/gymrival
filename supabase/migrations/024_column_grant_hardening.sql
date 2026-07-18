-- =============================================================================
-- 024_column_grant_hardening.sql
-- Phase 4 (cont.): column-level privilege hardening
-- =============================================================================
-- Problem
--   RLS restricts WHICH ROWS a user can touch, never WHICH COLUMNS. Migrations
--   002 / 018 granted table-level UPDATE on `profiles` to `authenticated`, so any
--   signed-in user could run:
--       UPDATE profiles SET role='admin', xp=999999, is_pro=true WHERE id = auth.uid();
--   and it would satisfy the "auth.uid() = id" policy. The comment in migration
--   018 claiming "RLS prevents self-promotion" was incorrect.
--
--   The same class of hole let a challenge participant overwrite their own
--   `score` / `baseline_score` directly and win any leaderboard.
--
-- Fix
--   Replace table-level UPDATE grants with column-level grants covering only the
--   fields the client legitimately edits. Trigger-driven columns (xp, level,
--   streak, friends_count, score, …) are written by SECURITY DEFINER functions,
--   which run as the function owner and are NOT affected by these grants.
-- =============================================================================


-- ── profiles ─────────────────────────────────────────────────────────────────
-- Editable by the user: profile fields + push token + (placeholder) is_pro flag.
-- Locked (server/trigger-owned): id, email, xp, level, role, streak,
-- friends_count, created_at, updated_at.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  username,
  full_name,
  avatar_url,
  gym,
  weight_kg,
  height_cm,
  goal,
  bio,
  quote,
  country_code,
  expo_push_token,
  is_pro
) ON public.profiles TO authenticated;


-- ── challenge_participants ───────────────────────────────────────────────────
-- Users may only change their own participation `status` (e.g. withdraw).
-- score / baseline_score / score_updated_at are maintained exclusively by the
-- update_challenge_scores() and set_challenge_baseline() SECURITY DEFINER
-- triggers, so revoking column UPDATE here does not affect scoring.

REVOKE UPDATE ON public.challenge_participants FROM authenticated;

GRANT UPDATE (status) ON public.challenge_participants TO authenticated;
