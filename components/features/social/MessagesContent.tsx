import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { formatDate, formatRelativeTime as formatRelativeTimeIntl } from '@/lib/i18n/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { FriendAvatar } from './FriendAvatar';

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
  const {
    conversations,
    conversationsLoading,
    loadConversations,
    subscribeToInbox,
    startPresenceHeartbeat,
    isOnline,
    unreadCount,
  } = useChatStore();

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
      <View style={msgStyles.emptyCard}>
        <ActivityIndicator color="#404040" />
      </View>
    );
  }

  if (!conversationsLoading && conversations.length === 0) {
    return (
      <View style={msgStyles.emptyCard}>
        <View style={msgStyles.emptyIconWrap}>
          <MessageCircle size={24} strokeWidth={1.5} color="#404040" />
        </View>
        <Text style={msgStyles.emptyTitle}>{t('noMessagesTitle')}</Text>
        <Text style={msgStyles.emptySubtitle}>{t('noMessagesSub')}</Text>
      </View>
    );
  }

  const total = unreadCount(userId);

  return (
    <>
      {total > 0 && (
        <View style={msgStyles.unreadBanner}>
          <Text style={msgStyles.unreadBannerText}>{t('unreadBanner', { count: total })}</Text>
        </View>
      )}

      <Text style={msgStyles.sectionLabel}>{t('allMessages')}</Text>
      <View style={msgStyles.convList}>
        {conversations.map((conv) => {
          const name = conv.other_user.full_name ?? conv.other_user.username ?? t('athlete');
          const online = isOnline(conv.other_user.id);
          const isFromMe = conv.last_message_sender_id === userId;
          const hasUnread =
            !isFromMe &&
            conv.last_message_content !== null &&
            conv.last_message_read_at === null;

          return (
            <Pressable
              key={conv.id}
              onPress={() => router.push(Routes.chat(conv.other_user.id) as never)}
              style={({ pressed }) => [msgStyles.convRow, pressed && msgStyles.convRowPressed]}
            >
              <FriendAvatar id={conv.other_user.id} name={name} size={50} online={online} />
              <View style={msgStyles.convInfo}>
                <View style={msgStyles.convHeader}>
                  <Text style={[msgStyles.convName, hasUnread && msgStyles.convNameUnread]}>
                    {name}
                  </Text>
                  <Text style={[msgStyles.convTime, hasUnread && msgStyles.convTimeUnread]}>
                    {formatConvTime(conv.last_message_at)}
                  </Text>
                </View>
                <View style={msgStyles.convPreviewRow}>
                  <Text style={[msgStyles.convPreview, hasUnread && msgStyles.convPreviewUnread]} numberOfLines={1}>
                    {conv.last_message_content
                      ? isFromMe
                        ? t('youPrefix', { message: conv.last_message_content })
                        : conv.last_message_content
                      : t('startConversation')}
                  </Text>
                  {hasUnread && <View style={msgStyles.unreadDot} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const msgStyles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 20,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  unreadBanner: {
    backgroundColor: 'rgba(230,48,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.25)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  unreadBannerText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#484848',
    letterSpacing: 2,
    marginBottom: 12,
  },
  convList: {
    marginBottom: 24,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  convRowPressed: {
    backgroundColor: '#1c1c1c',
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  convName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: '#ccc',
  },
  convNameUnread: {
    fontFamily: Fonts.bodySemiBold,
    color: '#fff',
  },
  convTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#454545',
  },
  convTimeUnread: {
    color: Colors.accent,
  },
  convPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  convPreview: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#505050',
    flex: 1,
  },
  convPreviewUnread: {
    color: '#888',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
});
