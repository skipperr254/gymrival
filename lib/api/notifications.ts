import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types/notification";

export async function fetchNotifications(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ data: AppNotification[]; hasMore: boolean; error: string | null }> {
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
    .range(offset, offset + limit - 1);

  if (error) return { data: [], hasMore: false, error: error.message };

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

  return { data: mapped, hasMore: mapped.length === limit, error: null };
}

/**
 * True unread count, independent of fetchNotifications' page size. Deriving
 * unread count from a capped list (e.g. the 50 most recent) undercounts for
 * any user with more unread notifications than the page size — this counts
 * every unread row server-side instead.
 */
export async function fetchUnreadNotificationCount(
  userId: string
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
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
