import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ArrowUp, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { fetchProfile } from '@/lib/api';
import { ChatAvatar, MessageList } from '@/components/features/social/chat';

const draftKey = (otherUserId: string) => `gymrival:chatDraft:${otherUserId}`;

export default function ChatScreen() {
  const { t } = useTranslation('social');
  const QUICK_REPLIES = t('chat.quickReplies', { returnObjects: true }) as string[];
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const { bottom: bottomInset } = useSafeAreaInsets();

  const {
    messages,
    messagesLoading,
    messagesError,
    loadingOlderMessages,
    hasMoreMessages,
    conversations,
    loadMessages,
    loadOlderMessages,
    sendMessage,
    subscribeToChat,
    fetchFriendsPresence,
    isOnline,
    getOrOpenChat,
    startPresenceHeartbeat,
  } = useChatStore();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initError, setInitError] = useState(false);
  const [otherUser, setOtherUser] = useState<{
    id: string;
    full_name: string | null;
    username: string | null;
    level: number;
  } | null>(null);
  const [input, setInput] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Draft persistence — survives the app being killed mid-compose ────────

  useEffect(() => {
    if (!otherUserId) return;
    AsyncStorage.getItem(draftKey(otherUserId)).then((saved) => {
      if (saved) setInput(saved);
    });
  }, [otherUserId]);

  useEffect(() => {
    if (!otherUserId) return;
    clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      if (input.trim()) {
        AsyncStorage.setItem(draftKey(otherUserId), input).catch(() => {});
      } else {
        AsyncStorage.removeItem(draftKey(otherUserId)).catch(() => {});
      }
    }, 400);
    return () => clearTimeout(draftSaveTimer.current);
  }, [input, otherUserId]);

  // ── Resolve other user's profile ──────────────────────────────────────────

  useEffect(() => {
    if (!otherUserId) return;

    // Fast path: profile already in the conversations list
    const existing = conversations.find((c) => c.other_user.id === otherUserId);
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
          level: data.level ?? 1,
        });
      }
    });
  }, [otherUserId, conversations]);

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

  // ── Scroll to bottom on new messages ─────────────────────────────────────

  useEffect(() => {
    if (!isAtBottom) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length, isAtBottom]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || !conversationId) return;
      sendMessage(conversationId, currentUserId, msg);
      setInput('');
      if (otherUserId) AsyncStorage.removeItem(draftKey(otherUserId)).catch(() => {});
      inputRef.current?.focus();
    },
    [input, conversationId, currentUserId, sendMessage, otherUserId]
  );

  // ── Scroll tracking for "load more" ──────────────────────────────────────

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number }; contentSize: { height: number } } }) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
      setIsAtBottom(atBottom);

      // Load older messages when scrolled to top
      if (contentOffset.y < 60 && conversationId) {
        loadOlderMessages(conversationId);
      }
    },
    [conversationId, loadOlderMessages]
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const displayName = otherUser?.full_name ?? otherUser?.username ?? t('athlete');
  const online = otherUserId ? isOnline(otherUserId) : false;

  // ── Error state ───────────────────────────────────────────────────────────

  if (initError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <View
          className="flex-row items-center gap-3 px-4 py-3 bg-[#1a1a1a]"
          style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#242424' }}
        >
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full border border-[#2a2a2a] bg-[#242424] items-center justify-center shrink-0"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <ChevronLeft size={18} strokeWidth={2} color="#888" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center gap-3 px-8 -mt-[60px]">
          <MessageCircle size={32} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('chat.cantOpen')}
          </Text>
          <Text className="font-sans text-[13px] text-[#555] text-center">
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
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full border border-[#2a2a2a] bg-[#242424] items-center justify-center shrink-0"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <ChevronLeft size={18} strokeWidth={2} color="#888" />
        </Pressable>

        {otherUserId ? (
          <ChatAvatar userId={otherUserId} name={displayName} size={40} online={online} />
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

      {/* Messages area */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        otherUserId={otherUserId ?? ''}
        displayName={displayName}
        loadingOlderMessages={loadingOlderMessages}
        hasMoreMessages={hasMoreMessages}
        messagesLoading={messagesLoading}
        messagesError={messagesError}
        onRetry={() => conversationId && loadMessages(conversationId, currentUserId)}
        scrollRef={scrollRef}
        onScroll={handleScroll}
      />

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0 pb-2"
        contentContainerStyle={styles.quickContent}
      >
        {QUICK_REPLIES.map((q, i) => (
          <Pressable
            key={i}
            onPress={() => handleSend(q)}
            className="py-1.5 px-3.5 rounded-full border border-[#2a2a2a] bg-[#1c1c1c]"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text className="font-sans text-xs text-[#888]">{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input bar */}
      <View className="flex-row items-end gap-2 px-4 pt-2.5" style={{ paddingBottom: inputBottomPad }}>
        <View className="flex-1 flex-row items-end bg-[#1c1c1c] border-[1.5px] border-[#2a2a2a] rounded-[22px] pl-4 pr-1 py-1">
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            placeholder={otherUser ? t('chat.messagePlaceholder', { name: displayName }) : t('chat.messagePlaceholderGeneric')}
            placeholderTextColor={Colors.hint}
            className="flex-1 font-sans text-sm text-white py-2.5 max-h-[120px]"
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || !conversationId}
            className={`w-[34px] h-[34px] rounded-full items-center justify-center shrink-0 mb-0.5 ${
              input.trim() && conversationId ? 'bg-accent' : 'bg-[#242424]'
            }`}
          >
            <ArrowUp size={16} strokeWidth={2.5} color={input.trim() && conversationId ? '#fff' : '#404040'} />
          </Pressable>
        </View>
      </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  quickContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 7,
  },
});
