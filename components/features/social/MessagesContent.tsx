import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Routes } from '@/constants/routes';
import { formatDate, formatRelativeTime as formatRelativeTimeIntl } from '@/lib/i18n/format';
import { useAuthStore } from '@/store/useAuthStore';
import { computeIsOnline, useChatStore } from '@/store/useChatStore';
import { ErrorState, Avatar } from '@/components/ui';
import { Colors } from '@/constants/theme';

function formatConvTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 1) return formatRelativeTimeIntl(date);
  if (diffDays < 7) return formatDate(date, { weekday: 'short' });
  return formatDate(date);
}

export function MessagesContent() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  // Per-field selectors — a whole-store subscription re-rendered the inbox on
  // every chat-store change (open-thread message traffic, etc.)
  const conversations = useChatStore((s) => s.conversations);
  const conversationsLoading = useChatStore((s) => s.conversationsLoading);
  const conversationsError = useChatStore((s) => s.conversationsError);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const subscribeToInbox = useChatStore((s) => s.subscribeToInbox);
  const startPresenceHeartbeat = useChatStore((s) => s.startPresenceHeartbeat);
  const unreadCount = useChatStore((s) => s.unreadCount);
  // Subscribed (not read via getState) so online dots update when presence
  // refreshes.
  const presenceMap = useChatStore((s) => s.presenceMap);

  useEffect(() => {
    if (!userId) return;
    loadConversations(userId);
    const unsubInbox = subscribeToInbox(userId);
    const stopHeartbeat = startPresenceHeartbeat(userId);
    return () => {
      unsubInbox();
      stopHeartbeat();
    };
    // Store actions are stable Zustand functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (conversationsLoading && conversations.length === 0) {
    return (
      <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
        <ActivityIndicator color={Colors.hint} />
      </View>
    );
  }

  if (conversationsError && conversations.length === 0) {
    return (
      <ErrorState
        message={t('loadErrorMessages')}
        retryLabel={t('retry')}
        onRetry={() => loadConversations(userId)}
      />
    );
  }

  if (!conversationsLoading && conversations.length === 0) {
    return (
      <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
        <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center mb-3.5">
          <MessageCircle size={24} strokeWidth={1.5} color={Colors.hint} />
        </View>
        <Text className="font-heading text-[17px] tracking-[2px] text-white mb-1.5">
          {t('noMessagesTitle')}
        </Text>
        <Text className="font-sans text-[13px] text-muted text-center">
          {t('noMessagesSub')}
        </Text>
      </View>
    );
  }

  const total = unreadCount(userId);

  return (
    <>
      {total > 0 && (
        <View className="bg-[rgba(230,48,48,0.12)] border border-[rgba(230,48,48,0.25)] rounded-[10px] py-[7px] px-3.5 self-start mb-3.5">
          <Text className="font-heading text-[10px] text-accent tracking-[2px]">
            {t('unreadBanner', { count: total })}
          </Text>
        </View>
      )}

      <Text className="font-heading text-[10px] text-[#484848] tracking-[2px] mb-3">
        {t('allMessages')}
      </Text>
      <View className="mb-6">
        {conversations.map((conv) => {
          const name = conv.other_user.full_name ?? conv.other_user.username ?? t('athlete');
          const online = computeIsOnline(presenceMap[conv.other_user.id] ?? null);
          const isFromMe = conv.last_message_sender_id === userId;
          const hasUnread =
            !isFromMe &&
            conv.last_message_content !== null &&
            conv.last_message_read_at === null;

          return (
            <Pressable
              key={conv.id}
              onPress={() => router.push(Routes.chat(conv.other_user.id) as never)}
              className="flex-row items-center gap-[13px] py-[13px] px-3 rounded-2xl"
              style={({ pressed }) => pressed && { backgroundColor: '#1c1c1c' }}
            >
              <Avatar userId={conv.other_user.id} name={name} avatarUrl={conv.other_user.avatar_url} size={50} online={online} />
              <View className="flex-1 min-w-0">
                <View className="flex-row justify-between items-baseline mb-[3px]">
                  <Text
                    className={`text-[15px] ${
                      hasUnread ? 'font-sans-semibold text-white' : 'font-sans-medium text-[#ccc]'
                    }`}
                  >
                    {name}
                  </Text>
                  <Text
                    className={`font-sans text-[11px] ${
                      hasUnread ? 'text-accent' : 'text-[#454545]'
                    }`}
                  >
                    {formatConvTime(conv.last_message_at)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 flex-1">
                  <Text
                    className={`font-sans text-[13px] flex-1 ${
                      hasUnread ? 'text-[#888]' : 'text-[#505050]'
                    }`}
                    numberOfLines={1}
                  >
                    {conv.last_message_content
                      ? isFromMe
                        ? t('youPrefix', { message: conv.last_message_content })
                        : conv.last_message_content
                      : t('startConversation')}
                  </Text>
                  {hasUnread && (
                    <View className="w-2 h-2 rounded-full bg-accent shrink-0" />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
