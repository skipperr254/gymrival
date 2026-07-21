import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/user";

type ProfileUpdate = Partial<
  Pick<Profile, "username" | "full_name" | "height_cm" | "weight_kg" | "gym" | "goal" | "bio" | "quote">
>;

const AVATARS_BUCKET = "avatars";

export async function updateProfile(
  userId: string,
  data: ProfileUpdate
): Promise<{ error: string | null; code: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  // `code` (e.g. Postgres '23505' unique-violation) lets callers map known
  // failures to friendly copy instead of displaying the raw DB error text.
  return { error: error?.message ?? null, code: error?.code ?? null };
}

/**
 * Uploads a profile photo and points `profiles.avatar_url` at it. Always
 * written to the same path ({user_id}/avatar) regardless of source format —
 * one file per user, overwritten on re-upload — so re-uploading never leaves
 * an orphaned file behind from a previous extension.
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string,
  mimeType: string
): Promise<{ avatarUrl: string | null; error: string | null }> {
  const path = `${userId}/avatar`;

  try {
    const form = new FormData();
    form.append('file', { uri: imageUri, type: mimeType, name: 'avatar' } as unknown as Blob);
    const { error: storageErr } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, form, { contentType: mimeType, upsert: true });
    if (storageErr) return { avatarUrl: null, error: storageErr.message };
  } catch (e) {
    return { avatarUrl: null, error: e instanceof Error ? e.message : 'Upload failed' };
  }

  // Cache-bust: the path never changes on re-upload, so without a query
  // param every client's already-cached Image would keep showing the old photo.
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (updateErr) return { avatarUrl: null, error: updateErr.message };

  return { avatarUrl, error: null };
}

/** Removes the user's uploaded photo — they revert to the generated initials avatar. */
export async function removeAvatar(userId: string): Promise<{ error: string | null }> {
  await supabase.storage.from(AVATARS_BUCKET).remove([`${userId}/avatar`]);
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

// Excludes `email` and `expo_push_token` — the database grant no longer
// allows selecting either column (see migration 032). The signed-in user's
// own email comes from the Supabase Auth session (`user.email`), never from
// `profiles.email`; nothing in the UI needs to display a push token.
const PROFILE_SELECT =
  "id, avatar_url, username, full_name, gym, weight_kg, height_cm, goal, bio, quote, xp, level, is_pro, streak, friends_count, role, language, country_code, push_enabled, created_at, updated_at";

export async function fetchProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();
  return { data: data as Profile | null, error: error?.message ?? null };
}

export async function togglePro(
  userId: string,
  isPro: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("id", userId);
  return { error: error?.message ?? null };
}

/** Fetch just the user's stored language preference — used at app boot, before the full profile is needed. */
export async function getUserLanguage(
  userId: string
): Promise<{ data: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', userId)
    .single();
  return { data: data?.language ?? null, error: error?.message ?? null };
}

/** Persist an explicit language choice made in Settings so it follows the user across devices. */
export async function updateLanguage(
  userId: string,
  language: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ language })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

/** Persist the user's push-notification opt-in/out choice, made in Settings. */
export async function updatePushEnabled(
  userId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ push_enabled: enabled })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

export async function savePushToken(
  userId: string,
  token: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

/**
 * Unregister the device's push token on sign-out. Expo push tokens are
 * device-scoped, not session-scoped — without this, a shared/reused device
 * keeps receiving the signed-out account's push notifications (message
 * previews, PR likes, etc.) after a different user signs in on it.
 */
export async function clearPushToken(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

// Push notifications are triggered server-side by a Postgres trigger
// (tr_notifications_push, migration 028) whenever a row is inserted into
// `notifications` — see supabase/functions/send-notification. There is no
// client-side wrapper: composing push text on the client would use the
// actor's language, not the recipient's, which is exactly the bug this
// server-side design avoids.
