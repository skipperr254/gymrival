import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api';
import type { AppNotification } from '@/types/notification';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
}

interface NotificationActions {
  loadNotifications: (userId: string) => Promise<void>;
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

    loadNotifications: async (userId) => {
      set({ loading: true });
      const { data } = await fetchNotifications(userId);
      set({
        notifications: data,
        unreadCount: data.filter((n) => !n.read_at).length,
        loading: false,
      });
    },

    markRead: async (notificationId) => {
      // Optimistic update
      const prev = get().notifications;
      const updated = prev.map((n) =>
        n.id === notificationId && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n
      );
      set({
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read_at).length,
      });
      await markNotificationRead(notificationId);
    },

    markAllRead: async (userId) => {
      const now = new Date().toISOString();
      const updated = get().notifications.map((n) => ({
        ...n,
        read_at: n.read_at ?? now,
      }));
      set({ notifications: updated, unreadCount: 0 });
      await markAllNotificationsRead(userId);
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
      set({ notifications: [], unreadCount: 0, loading: false });
    },
  })
);
