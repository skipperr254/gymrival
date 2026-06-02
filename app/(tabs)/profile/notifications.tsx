import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { Colors, Fonts, FontSizes } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { AppNotification, NotificationType } from '@/types/notification';

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildNotificationText(n: AppNotification): string {
  const name = n.actor_name ?? n.actor_username ?? 'Someone';
  switch (n.type as NotificationType) {
    case 'new_message':
      return `${name} sent you a message`;
    case 'friend_request':
      return `${name} sent you a friend request`;
    case 'friend_request_accepted':
      return `${name} accepted your friend request`;
    case 'pr_liked': {
      const label = n.data.exercise_label ?? 'your PR';
      const val = n.data.value != null ? ` (${n.data.value}${n.data.unit ?? ''})` : '';
      return `${name} liked your ${label}${val} PR`;
    }
    case 'friend_pr': {
      const label = n.data.exercise_label ?? 'a PR';
      const val = n.data.value != null ? ` ${n.data.value}${n.data.unit ?? ''}` : '';
      return `${name} just hit a new ${label}${val} PR`;
    }
    default:
      return 'You have a new notification';
  }
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function notificationIcon(type: NotificationType): { name: IoniconName; color: string } {
  switch (type) {
    case 'new_message':
      return { name: 'chatbubble', color: '#4A9EFF' };
    case 'friend_request':
      return { name: 'person-add', color: Colors.success };
    case 'friend_request_accepted':
      return { name: 'people', color: Colors.success };
    case 'pr_liked':
      return { name: 'heart', color: Colors.accent };
    case 'friend_pr':
      return { name: 'trophy', color: Colors.warning };
  }
}

function actorInitial(n: AppNotification): string {
  const name = n.actor_name ?? n.actor_username ?? '?';
  return name.charAt(0).toUpperCase();
}

// Deterministic color from actor_id (matches FriendAvatar pattern in social screen)
const AVATAR_COLORS = [
  '#e63030', '#ff6b35', '#f7c948', '#00cc44',
  '#4A9EFF', '#a855f7', '#ec4899', '#14b8a6',
];
function avatarColor(id: string | null): string {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function handleNotificationPress(n: AppNotification) {
  switch (n.type as NotificationType) {
    case 'new_message':
      if (n.actor_id) router.push(Routes.chat(n.actor_id) as never);
      break;
    case 'friend_request':
    case 'friend_request_accepted':
      router.push(Routes.socialFriends as never);
      break;
    case 'pr_liked':
    case 'friend_pr':
      router.push(Routes.social as never);
      break;
  }
}

// ─── NotificationItem ────────────────────────────────────────────────────────

function NotificationItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (n: AppNotification) => void;
}) {
  const isUnread = !item.read_at;
  const icon = notificationIcon(item.type as NotificationType);
  const bgColor = avatarColor(item.actor_id);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        isUnread && styles.itemUnread,
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => onPress(item)}
    >
      {isUnread && <View style={styles.unreadBar} />}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: bgColor + '30', borderColor: bgColor + '50' }]}>
        <Text style={[styles.avatarText, { color: bgColor }]}>
          {actorInitial(item)}
        </Text>
        <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={9} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.itemBody}>
        <Text style={[styles.itemText, isUnread && styles.itemTextUnread]} numberOfLines={2}>
          {buildNotificationText(item)}
        </Text>
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
      </View>

      {isUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  const load = useCallback(() => {
    if (user?.id) loadNotifications(user.id);
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = useCallback(
    async (n: AppNotification) => {
      if (!n.read_at) await markRead(n.id);
      handleNotificationPress(n);
    },
    [markRead]
  );

  const handleMarkAll = useCallback(() => {
    if (user?.id) markAllRead(user.id);
  }, [user?.id, markAllRead]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.markAllBtn, pressed && { opacity: 0.5 }]}
            onPress={handleMarkAll}
          >
            <Text style={styles.markAllText}>MARK ALL</Text>
          </Pressable>
        ) : (
          <View style={styles.markAllBtn} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handlePress} />
          )}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="notifications-off-outline" size={40} color={Colors.hint} />
              </View>
              <Text style={styles.emptyTitle}>ALL CAUGHT UP</Text>
              <Text style={styles.emptySub}>
                {"You'll see messages, friend requests, and PR likes here."}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderDefault,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    letterSpacing: 2,
  },
  headerBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: '#fff',
  },
  markAllBtn: {
    width: 68,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: Colors.surface,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.lg,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.base,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    lineHeight: 19,
  },
  itemTextUnread: {
    color: Colors.primary,
    fontFamily: Fonts.bodyMedium,
  },
  itemTime: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes['2xl'],
    color: Colors.primary,
    letterSpacing: 2,
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
