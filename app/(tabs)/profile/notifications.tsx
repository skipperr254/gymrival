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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { formatDate, formatRelativeTime } from '@/lib/i18n/format';
import type { AppNotification, NotificationType } from '@/types/notification';

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diffDays < 7) return formatRelativeTime(dateStr);
  return formatDate(dateStr);
}

function buildNotificationText(n: AppNotification, t: TFunction): string {
  const name = n.actor_name ?? n.actor_username ?? t('notifications:someone');
  switch (n.type as NotificationType) {
    case 'new_message':
      return t('notifications:newMessage', { name });
    case 'friend_request':
      return t('notifications:friendRequest', { name });
    case 'friend_request_accepted':
      return t('notifications:friendRequestAccepted', { name });
    case 'pr_liked': {
      const exercise = n.data.exercise_key
        ? t(`exercises:${n.data.exercise_key}`)
        : t('notifications:yourPr');
      const value = n.data.value != null ? ` (${n.data.value}${n.data.unit ?? ''})` : '';
      return t('notifications:prLiked', { name, exercise, value });
    }
    case 'friend_pr': {
      const exercise = n.data.exercise_key
        ? t(`exercises:${n.data.exercise_key}`)
        : t('notifications:aPr');
      const value = n.data.value != null ? ` ${n.data.value}${n.data.unit ?? ''}` : '';
      return t('notifications:friendPr', { name, exercise, value });
    }
    default:
      return t('notifications:generic');
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
  const { t } = useTranslation();
  const isUnread = !item.read_at;
  const icon = notificationIcon(item.type as NotificationType);
  const bgColor = avatarColor(item.actor_id);

  return (
    <Pressable
      className={`flex-row items-center px-4 py-3.5 gap-3 ${isUnread ? 'bg-surface' : ''}`}
      style={({ pressed }) => [
        { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderSubtle },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => onPress(item)}
    >
      {isUnread && <View className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-[2px]" />}

      {/* Avatar */}
      <View
        className="w-[46px] h-[46px] rounded-full items-center justify-center border shrink-0"
        style={{ backgroundColor: bgColor + '30', borderColor: bgColor + '50' }}
      >
        <Text className="font-heading text-lg" style={{ color: bgColor }}>
          {actorInitial(item)}
        </Text>
        <View
          className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full items-center justify-center border-2 border-base"
          style={{ backgroundColor: icon.color }}
        >
          <Ionicons name={icon.name} size={9} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 gap-[3px]">
        <Text
          className={`font-sans text-sm leading-[19px] ${
            isUnread ? 'font-sans-medium text-primary' : 'text-secondary'
          }`}
          numberOfLines={2}
        >
          {buildNotificationText(item, t)}
        </Text>
        <Text className="font-sans text-xs text-muted">{timeAgo(item.created_at)}</Text>
      </View>

      {isUnread && <View className="w-2 h-2 rounded-full bg-accent shrink-0" />}
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t } = useTranslation('profile');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3.5"
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault }}
      >
        <Pressable
          className="w-9 h-9 items-center justify-center"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </Pressable>

        <View className="flex-1 flex-row items-center justify-center gap-2">
          <Text className="font-heading text-xl text-primary tracking-[2px]">
            {t('notifications.title')}
          </Text>
          {unreadCount > 0 && (
            <View className="bg-accent rounded-full min-w-[20px] h-5 items-center justify-center px-[5px]">
              <Text className="font-sans-bold text-[11px] text-white">{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            className="w-[68px] items-end"
            style={({ pressed }) => pressed && { opacity: 0.5 }}
            onPress={handleMarkAll}
          >
            <Text className="font-heading text-[11px] text-accent tracking-[1px]">
              {t('notifications.markAll')}
            </Text>
          </Pressable>
        ) : (
          <View className="w-[68px] items-end" />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
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
            <View className="flex-1 items-center justify-center px-10 pt-20 gap-3">
              <View className="w-[72px] h-[72px] rounded-full items-center justify-center bg-surface mb-1">
                <Ionicons name="notifications-off-outline" size={40} color={Colors.hint} />
              </View>
              <Text className="font-heading text-2xl text-primary tracking-[2px]">
                {t('notifications.emptyTitle')}
              </Text>
              <Text className="font-sans text-sm text-muted text-center leading-5">
                {t('notifications.emptySub')}
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
  list: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
});
