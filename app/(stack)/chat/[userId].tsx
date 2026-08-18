import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { computeIsOnline, useChatStore } from '@/store/useChatStore';
import { fetchProfile } from '@/lib/api';
import { ChatInputBar, MessageList } from '@/components/features/social/chat';
import { Avatar } from '@/components/ui/Avatar';
import { BackButton } from '@/components/ui/BackButton';

export default function ChatScreen() {
  const { t } = useTranslation('social');
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const { bottom: bottomInset } = useSafeAreaInsets();

  // Per-field selectors: this screen re-renders for its own thread's state,
  // not for unrelated chat-store changes (inbox updates, other presence rows).
  const messages = useChatStore((s) => s.messages);
  const messagesLoading = useChatStore((s) => s.messagesLoading);
  const messagesError = useChatStore((s) => s.messagesError);
  const loadingOlderMessages = useChatStore((s) => s.loadingOlderMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const subscribeToChat = useChatStore((s) => s.subscribeToChat);
  const fetchFriendsPresence = useChatStore((s) => s.fetchFriendsPresence);
  const getOrOpenChat = useChatStore((s) => s.getOrOpenChat);
  const startPresenceHeartbeat = useChatStore((s) => s.startPresenceHeartbeat);
  const otherLastSeen = useChatStore((s) =>
    otherUserId ? (s.presenceMap[otherUserId] ?? null) : null
  );

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initError, setInitError] = useState(false);
  const [otherUser, setOtherUser] = useState<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    level: number;
  } | null>(null);

  // ── Resolve other user's profile ──────────────────────────────────────────

  useEffect(() => {
    if (!otherUserId) return;

    // Fast path: profile already in the conversations list (read once —
    // no subscription, so inbox updates don't re-render this screen)
    const existing = useChatStore
      .getState()
      .conversations.find((c) => c.other_user.id === otherUserId);
    if (existing) {
      setOtherUser(existing.other_user);
      return;
    }

    // Slow path: fetch from the API
    fetchProfile(otherUserId).then(({ data }) => {
      if (data) {
        setOtherUser({
          id: data.id,
          full_name: data.full_name,
          username: data.username,
          avatar_url: data.avatar_url,
          level: data.level ?? 1,
        });
      }
    });
  }, [otherUserId]);

  // ── Initialise conversation ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    getOrOpenChat(currentUserId, otherUserId).then((convId) => {
      if (!convId) {
        setInitError(true);
        return;
      }
      setConversationId(convId);
      loadMessages(convId, currentUserId);
    });
    // getOrOpenChat and loadMessages are stable Zustand actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, otherUserId]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    return subscribeToChat(conversationId, currentUserId);
    // subscribeToChat is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId]);

  // ── Presence ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!otherUserId || !currentUserId) return;
    fetchFriendsPresence([otherUserId]);
    const stopHeartbeat = startPresenceHeartbeat(currentUserId);
    return stopHeartbeat;
    // fetchFriendsPresence and startPresenceHeartbeat are stable Zustand actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, currentUserId]);

  // ── Stable callbacks (keep the memoized MessageList/ChatInputBar inert) ──

  const handleSend = useCallback(
    (text: string) => {
      if (!conversationId) return;
      sendMessage(conversationId, currentUserId, text);
    },
    [conversationId, currentUserId, sendMessage]
  );

  const handleLoadOlder = useCallback(() => {
    if (conversationId) loadOlderMessages(conversationId);
  }, [conversationId, loadOlderMessages]);

  const handleRetry = useCallback(() => {
    if (conversationId) loadMessages(conversationId, currentUserId);
  }, [conversationId, currentUserId, loadMessages]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const displayName = otherUser?.full_name ?? otherUser?.username ?? t('athlete');
  const online = computeIsOnline(otherLastSeen);

  // ── Error state ───────────────────────────────────────────────────────────

  if (initError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <View
          className="flex-row items-center gap-3 px-4 py-3 bg-[#1a1a1a]"
          style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#242424' }}
        >
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center gap-3 px-8 -mt-[60px]">
          <MessageCircle size={32} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('chat.cantOpen')}
          </Text>
          <Text className="font-sans text-[13px] text-muted text-center">
            {t('chat.errorSub')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // bottom padding for the input bar: safe area on devices with home indicator,
  // fallback to 16 on devices without one
  const inputBottomPad = bottomInset > 0 ? bottomInset + 4 : 16;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      {/* Header */}
      <View
        className="flex-row items-center gap-3 px-4 py-3 bg-[#1a1a1a]"
        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#242424' }}
      >
        <BackButton />

        {otherUserId ? (
          <Avatar userId={otherUserId} name={displayName} avatarUrl={otherUser?.avatar_url} size={40} online={online} />
        ) : (
          <View className="w-10 h-10 rounded-full bg-[#242424]" />
        )}

        <View className="flex-1">
          <Text className="font-sans-semibold text-[15px] text-white" numberOfLines={1}>
            {displayName}
          </Text>
          <Text
            className={`font-sans text-[11px] mt-px ${
              online ? 'text-success' : 'text-[#505050]'
            }`}
          >
            {online ? t('chat.online') : t('chat.offline')}
            {otherUser ? `  ·  ${t('lvl', { level: otherUser.level })}` : ''}
          </Text>
        </View>
      </View>

      {/* KeyboardAvoidingView wraps messages + input so the scroll area
          compresses correctly when the keyboard opens */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          otherUserId={otherUserId ?? ''}
          displayName={displayName}
          otherAvatarUrl={otherUser?.avatar_url ?? null}
          loadingOlderMessages={loadingOlderMessages}
          hasMoreMessages={hasMoreMessages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          onRetry={handleRetry}
          onLoadOlder={handleLoadOlder}
        />

        <ChatInputBar
          otherUserId={otherUserId ?? ''}
          placeholder={
            otherUser
              ? t('chat.messagePlaceholder', { name: displayName })
              : t('chat.messagePlaceholderGeneric')
          }
          canSend={!!conversationId}
          bottomPad={inputBottomPad}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
