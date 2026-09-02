-- =============================================================================
-- 040_add_push_enabled.sql
-- Adds a user-controlled push-notification kill switch.
-- =============================================================================
-- Defaults to true so existing users keep receiving push exactly as today —
-- this only adds an opt-out, it doesn't change default behavior. The
-- send-notification edge function checks this column before calling the
-- Expo push API (see supabase/functions/send-notification/index.ts).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true;

-- ── Column-level grants ──────────────────────────────────────────────────────
-- Migrations 024/025/032 replaced table-level UPDATE/SELECT on profiles with
-- column-level grants. Re-declare the full lists here, including
-- push_enabled, so each stays a single readable source of truth rather than
-- an accumulating diff across migrations.

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
  language,
  push_enabled
) ON public.profiles TO authenticated;

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  full_name,
  username,
  avatar_url,
  gym,
  weight_kg,
  height_cm,
  goal,
  bio,
  quote,
  xp,
  level,
  is_pro,
  streak,
  friends_count,
  role,
  language,
  country_code,
  push_enabled,
  created_at,
  updated_at
) ON public.profiles TO authenticated;
