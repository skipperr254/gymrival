import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ArrowUp, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { fetchProfile } from '@/lib/api';
import { ChatAvatar, MessageList, styles } from '@/components/features/social/chat';

export default function ChatScreen() {
  const { t } = useTranslation('social');
  const QUICK_REPLIES = t('chat.quickReplies', { returnObjects: true }) as string[];
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const { bottom: bottomInset } = useSafeAreaInsets();

  const {
    messages,
    messagesLoading,
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
      inputRef.current?.focus();
    },
    [input, conversationId, currentUserId, sendMessage]
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={18} strokeWidth={2} color="#888" />
          </Pressable>
        </View>
        <View style={styles.errorWrap}>
          <MessageCircle size={32} strokeWidth={1.4} color="#333" />
          <Text style={styles.errorTitle}>{t('chat.cantOpen')}</Text>
          <Text style={styles.errorSub}>{t('chat.errorSub')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // bottom padding for the input bar: safe area on devices with home indicator,
  // fallback to 16 on devices without one
  const inputBottomPad = bottomInset > 0 ? bottomInset + 4 : 16;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={18} strokeWidth={2} color="#888" />
        </Pressable>

        {otherUserId ? (
          <ChatAvatar userId={otherUserId} name={displayName} size={40} online={online} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#242424' }} />
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.headerStatus, online && styles.headerStatusOnline]}>
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
        scrollRef={scrollRef}
        onScroll={handleScroll}
      />

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickScroll}
        contentContainerStyle={styles.quickContent}
      >
        {QUICK_REPLIES.map((q, i) => (
          <Pressable
            key={i}
            onPress={() => handleSend(q)}
            style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.quickBtnText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputRow, { paddingBottom: inputBottomPad }]}>
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            placeholder={otherUser ? t('chat.messagePlaceholder', { name: displayName }) : t('chat.messagePlaceholderGeneric')}
            placeholderTextColor={Colors.hint}
            style={styles.input}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || !conversationId}
            style={[styles.sendBtn, input.trim() && conversationId ? styles.sendBtnActive : styles.sendBtnInactive]}
          >
            <ArrowUp size={16} strokeWidth={2.5} color={input.trim() && conversationId ? '#fff' : '#404040'} />
          </Pressable>
        </View>
      </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
