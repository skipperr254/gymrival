import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useSocialStore } from '@/store/useSocialStore';
import { Colors } from '@/constants/theme';

function IconBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View className="absolute -top-1 -right-1 bg-accent rounded-full min-w-[16px] h-4 items-center justify-center px-1 border border-base">
      <Text className="font-heading text-[9px] text-white leading-[14px]">{label}</Text>
    </View>
  );
}

/**
 * Slim feed-first header: brand wordmark on the left, Messages and Friends
 * entry points (with live badges) on the right — the feed itself owns the rest
 * of the screen.
 */
export function SocialHeader() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const msgUnread = useChatStore((s) => s.unreadCount(userId));
  const pendingRequests = useSocialStore((s) => s.incomingRequests.length);

  return (
    <View className="flex-row items-center justify-between pt-4 pb-2 px-4">
      <Text className="font-heading text-white tracking-[5px] text-[24px] leading-7">
        GYM RIVAL
      </Text>
      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={() => router.push(Routes.socialFriends as never)}
          accessibilityRole="button"
          accessibilityLabel={t('headerFriends')}
          hitSlop={6}
          className="w-10 h-10 rounded-full bg-surface border border-default items-center justify-center"
        >
          <Users size={18} strokeWidth={1.8} color={Colors.secondary} />
          <IconBadge count={pendingRequests} />
        </Pressable>
        <Pressable
          onPress={() => router.push(Routes.socialMessages as never)}
          accessibilityRole="button"
          accessibilityLabel={t('headerMessages')}
          hitSlop={6}
          className="w-10 h-10 rounded-full bg-surface border border-default items-center justify-center"
        >
          <MessageCircle size={18} strokeWidth={1.8} color={Colors.secondary} />
          <IconBadge count={msgUnread} />
        </Pressable>
      </View>
    </View>
  );
}
