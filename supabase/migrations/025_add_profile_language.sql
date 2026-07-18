-- =============================================================================
-- 025_add_profile_language.sql
-- Adds a user-selectable display language to profiles.
-- =============================================================================
-- NULL means "follow device locale" (the client keeps auto-detecting).
-- A non-null value means the user explicitly picked a language in Settings,
-- and it becomes the cross-device source of truth from then on.
--
-- Deliberately no CHECK enum constraint here — the set of supported languages
-- lives in the client (lib/i18n/languages.ts) so that adding a new language
-- later is a content-only change, not a migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT;

-- ── Column-level grant ───────────────────────────────────────────────────────
-- Migration 024 replaced table-level UPDATE on profiles with a column-level
-- grant (auth boundary lives at the column, not just the row). Re-declare the
-- full editable column list here, including the new `language` column, so the
-- grant stays a single readable source of truth rather than an accumulating
-- diff across migrations.

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
  is_pro,
  language
) ON public.profiles TO authenticated;
