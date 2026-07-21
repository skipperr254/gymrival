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
import {
  MessageCircle, UserPlus, Users, Heart, Trophy, Bell, BellOff,
  type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { BackButton } from '@/components/ui/BackButton';
import { formatDate, formatRelativeTime } from '@/lib/i18n/format';
import { Avatar } from '@/components/ui/Avatar';
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

function notificationIcon(type: NotificationType): { icon: LucideIcon; color: string } {
  switch (type) {
    case 'new_message':
      return { icon: MessageCircle, color: Colors.friend };
    case 'friend_request':
      return { icon: UserPlus, color: Colors.success };
    case 'friend_request_accepted':
      return { icon: Users, color: Colors.success };
    case 'pr_liked':
      return { icon: Heart, color: Colors.accent };
    case 'friend_pr':
      return { icon: Trophy, color: Colors.warning };
    default:
      // A notification type the client doesn't recognize yet (e.g. a new
      // type shipped server-side before this app version updated, or bad
      // data) must not crash the whole screen — fall back to a generic icon,
      // mirroring buildNotificationText's default case above.
      return { icon: Bell, color: Colors.hint };
  }
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
  const notifIcon = notificationIcon(item.type as NotificationType);

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
      <View style={{ position: 'relative' }}>
        <Avatar
          userId={item.actor_id ?? undefined}
          name={item.actor_name ?? item.actor_username ?? '?'}
          avatarUrl={item.actor_avatar_url}
          size={46}
        />
        <View
          className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full items-center justify-center border-2 border-base"
          style={{ backgroundColor: notifIcon.color }}
        >
          <notifIcon.icon size={9} color={Colors.primary} />
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
    loadingMore,
    loadNotifications,
    loadMoreNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  const load = useCallback(() => {
    if (user?.id) loadNotifications(user.id);
  }, [user?.id, loadNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLoadMore = useCallback(() => {
    if (user?.id) loadMoreNotifications(user.id);
  }, [user?.id, loadMoreNotifications]);

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
        <BackButton />

        <View className="flex-1 flex-row items-center justify-center gap-2">
          <Text className="font-heading text-xl text-primary tracking-[2px]">
            {t('notifications.title')}
          </Text>
          {unreadCount > 0 && (
            <View className="bg-accent rounded-full min-w-[20px] h-5 items-center justify-center px-[5px]">
              {/* Same cap as the tab-icon badge (app/(tabs)/profile/index.tsx)
                  — this one previously rendered the raw number uncapped. */}
              <Text className="font-sans-bold text-[11px] text-white">
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-5">
                <ActivityIndicator color={Colors.accent} size="small" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-10 pt-20 gap-3">
              <View className="w-[72px] h-[72px] rounded-full items-center justify-center bg-surface mb-1">
                <BellOff size={40} color={Colors.hint} />
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
