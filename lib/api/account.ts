import { supabase } from "@/lib/supabase";

/**
 * Permanently deletes the signed-in user's account and all their data
 * (`delete-account` edge function). The server identifies the user from the
 * JWT. On success the session is dead server-side; the caller must sign out
 * locally.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  return { error: error?.message ?? null };
}
