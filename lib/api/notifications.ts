import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types/notification";

export async function fetchNotifications(
  userId: string,
  limit = 50
): Promise<{ data: AppNotification[]; error: string | null }> {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      user_id,
      type,
      actor_id,
      data,
      read_at,
      created_at,
      actor:profiles!actor_id(full_name, username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };

  const mapped: AppNotification[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    actor_id: row.actor_id ?? null,
    actor_name: row.actor?.full_name ?? null,
    actor_username: row.actor?.username ?? null,
    actor_avatar_url: row.actor?.avatar_url ?? null,
    data: row.data,
    read_at: row.read_at ?? null,
    created_at: row.created_at,
  }));

  return { data: mapped, error: null };
}

export async function markNotificationRead(
  notificationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  return { error: error?.message ?? null };
}
