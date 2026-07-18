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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ArrowUp, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { fetchProfile } from '@/lib/api';
import { formatDate, formatRelativeDay } from '@/lib/i18n/format';

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

function ChatAvatar({
  userId,
  name,
  size = 40,
  online = false,
}: {
  userId: string;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const charSum = [...userId.replace(/-/g, '').slice(0, 8)].reduce(
    (s, c) => s + c.charCodeAt(0),
    0
  );
  const color = AVATAR_PALETTE[charSum % AVATAR_PALETTE.length];
  const initials = name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.3);

  return (
    <View style={{ position: 'relative', flexShrink: 0 }}>
      <LinearGradient
        colors={[color, '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color + '55',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: Fonts.display, fontSize, color: '#fff', letterSpacing: 1 }}>
          {initials}
        </Text>
      </LinearGradient>
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: Colors.success,
            borderWidth: 2,
            borderColor: Colors.base,
          }}
        />
      )}
    </View>
  );
}

// ─── Date divider label ───────────────────────────────────────────────────────

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 1) return formatRelativeDay(diffDays).toUpperCase();
  if (diffDays < 7) return formatDate(date, { weekday: 'long' }).toUpperCase();
  return formatDate(date).toUpperCase();
}

function formatMessageTime(iso: string): string {
  return formatDate(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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

  // ── Group messages by date ────────────────────────────────────────────────

  type DateGroup = { label: string; msgs: typeof messages };
  const groups: DateGroup[] = [];
  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  }

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
      <ScrollView
        ref={scrollRef}
        style={styles.messageArea}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {/* Older messages loader */}
        {loadingOlderMessages && (
          <ActivityIndicator color="#404040" style={{ marginBottom: 12 }} />
        )}

        {/* "All caught up" hint when no more history */}
        {!hasMoreMessages && messages.length > 0 && (
          <View style={styles.historyEnd}>
            <Text style={styles.historyEndText}>{t('chat.startOfConversation')}</Text>
          </View>
        )}

        {/* Initial loading */}
        {messagesLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#404040" />
          </View>
        )}

        {/* Empty conversation */}
        {!messagesLoading && messages.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {t('chat.sayHello', { name: displayName })}
            </Text>
          </View>
        )}

        {/* Message groups */}
        {groups.map((group) => (
          <View key={group.label}>
            {/* Date divider */}
            <View style={styles.dateDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{group.label}</Text>
              <View style={styles.dividerLine} />
            </View>

            {group.msgs.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId;
              const prev = group.msgs[i - 1];
              const next = group.msgs[i + 1];
              const showAvatar = !isMe && prev?.sender_id !== msg.sender_id;
              const isLastInGroup = !next || next.sender_id !== msg.sender_id;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowMe : styles.messageRowOther,
                    { marginBottom: isLastInGroup ? 8 : 2 },
                  ]}
                >
                  {!isMe && (
                    showAvatar ? (
                      <ChatAvatar userId={otherUserId ?? ''} name={displayName} size={28} />
                    ) : (
                      <View style={{ width: 28, flexShrink: 0 }} />
                    )
                  )}

                  <View style={[styles.bubbleGroup, isMe ? styles.bubbleGroupMe : styles.bubbleGroupOther]}>
                    <View style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleOther,
                      msg.id.startsWith('temp-') && styles.bubbleSending,
                    ]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {msg.content}
                      </Text>
                    </View>
                    {isLastInGroup && (
                      <View style={[styles.metaRow, isMe && styles.metaRowMe]}>
                        <Text style={styles.bubbleTime}>{formatMessageTime(msg.created_at)}</Text>
                        {isMe && (
                          <Text style={styles.readStatus}>
                            {msg.read_at ? t('chat.read') : t('chat.sent')}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },
  headerStatus: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#505050',
    marginTop: 1,
  },
  headerStatusOnline: {
    color: Colors.success,
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#484848',
    textAlign: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    marginTop: -60,
  },
  errorTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
  },
  errorSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  historyEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  historyEndText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#333',
    letterSpacing: 2,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e1e1e',
  },
  dividerText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#404040',
    letterSpacing: 1.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleGroup: {
    maxWidth: '72%',
    gap: 2,
  },
  bubbleGroupMe: {
    alignItems: 'flex-end',
  },
  bubbleGroupOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: {
    backgroundColor: Colors.accent,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#242424',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleSending: {
    opacity: 0.6,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleTime: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#404040',
  },
  readStatus: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#404040',
  },
  quickScroll: {
    flexGrow: 0,
    paddingBottom: 8,
  },
  quickContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 7,
  },
  quickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1c1c1c',
  },
  quickBtnText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#888',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingBottom applied dynamically via useSafeAreaInsets
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1c1c1c',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 9,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.accent,
  },
  sendBtnInactive: {
    backgroundColor: '#242424',
  },
});
