import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api';
import type { AppNotification } from '@/types/notification';

const PAGE_SIZE = 50;

interface NotificationState {
  notifications: AppNotification[];
  /** True total unread count from a dedicated server-side count query — not
   * derived from `notifications`, which is only ever a capped/paginated
   * page and would otherwise undercount for anyone with more unread rows
   * than fit on one page. */
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}

interface NotificationActions {
  loadNotifications: (userId: string) => Promise<void>;
  loadMoreNotifications: (userId: string) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
  reset: () => void;
}

let channel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationState & NotificationActions>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    loadingMore: false,
    hasMore: true,

    loadNotifications: async (userId) => {
      set({ loading: true });
      const [{ data, hasMore }, { count }] = await Promise.all([
        fetchNotifications(userId, PAGE_SIZE, 0),
        fetchUnreadNotificationCount(userId),
      ]);
      set({
        notifications: data,
        unreadCount: count,
        hasMore,
        loading: false,
      });
    },

    loadMoreNotifications: async (userId) => {
      const { loading, loadingMore, hasMore, notifications } = get();
      if (loading || loadingMore || !hasMore) return;

      set({ loadingMore: true });
      const { data, hasMore: more } = await fetchNotifications(userId, PAGE_SIZE, notifications.length);
      set({
        // De-dupe in case a realtime insert already prepended one of these
        notifications: [
          ...notifications,
          ...data.filter((n) => !notifications.some((existing) => existing.id === n.id)),
        ],
        hasMore: more,
        loadingMore: false,
      });
    },

    markRead: async (notificationId) => {
      // Optimistic update
      const prevNotifications = get().notifications;
      const prevUnreadCount = get().unreadCount;
      const wasUnread = prevNotifications.some((n) => n.id === notificationId && !n.read_at);
      const updated = prevNotifications.map((n) =>
        n.id === notificationId && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n
      );
      set({
        notifications: updated,
        // Decrement the real count directly rather than recomputing from
        // `notifications` — that list is only ever one page, so filtering it
        // would silently corrupt the count once a user has more unread rows
        // than fit on a page.
        unreadCount: wasUnread ? Math.max(0, prevUnreadCount - 1) : prevUnreadCount,
      });
      const { error } = await markNotificationRead(notificationId);
      if (error) {
        // Roll back — otherwise the badge stayed cleared/decremented
        // indefinitely (until the next full loadNotifications) even though
        // nothing was actually persisted.
        set({ notifications: prevNotifications, unreadCount: prevUnreadCount });
      }
    },

    markAllRead: async (userId) => {
      const prevNotifications = get().notifications;
      const prevUnreadCount = get().unreadCount;
      const now = new Date().toISOString();
      const updated = prevNotifications.map((n) => ({
        ...n,
        read_at: n.read_at ?? now,
      }));
      set({ notifications: updated, unreadCount: 0 });
      const { error } = await markAllNotificationsRead(userId);
      if (error) {
        set({ notifications: prevNotifications, unreadCount: prevUnreadCount });
      }
    },

    subscribeToNotifications: (userId) => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            // Fetch the new notification with full actor data
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
              .eq('id', (payload.new as { id: string }).id)
              .single();

            if (error || !data) return;

            const row = data as any;
            const notif: AppNotification = {
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
            };

            set((state) => ({
              notifications: [notif, ...state.notifications],
              unreadCount: state.unreadCount + 1,
            }));
          }
        )
        .subscribe();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      };
    },

    reset: () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      set({ notifications: [], unreadCount: 0, loading: false, loadingMore: false, hasMore: true });
    },
  })
);
