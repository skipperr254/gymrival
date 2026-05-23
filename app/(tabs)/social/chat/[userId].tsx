import { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Phone,
  MoreHorizontal,
  ImagePlus,
  ArrowUp,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: number;
  from: 'me' | 'other';
  text: string;
  time: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const USER_DATA: Record<string, { name: string; level: number }> = {
  '2': { name: 'Daan', level: 10 },
  '3': { name: 'Sara', level: 14 },
  '4': { name: 'Mike', level: 8 },
  '5': { name: 'Lisa', level: 11 },
};

const ONLINE_IDS = ['3', '5'];

const INIT_MESSAGES: Record<string, Message[]> = {
  '2': [
    { id: 1, from: 'other', text: 'Bro, have you tried bench press with close grip?', time: '10:32' },
    { id: 2, from: 'me', text: 'Yeah man! Felt the triceps way more. You should try it', time: '10:34' },
    { id: 3, from: 'other', text: 'Nice! When are you training next?', time: '10:35' },
    { id: 4, from: 'me', text: 'Tonight, leg day', time: '10:36' },
  ],
  '3': [
    { id: 1, from: 'other', text: 'Hey! Have you seen my PR video yet?', time: 'Yesterday' },
    { id: 2, from: 'me', text: 'Yes!! 18 pull-ups is insane', time: 'Yesterday' },
    { id: 3, from: 'other', text: "Haha thanks! You're almost at my level on squat", time: 'Yesterday' },
  ],
  '4': [
    { id: 1, from: 'other', text: 'What program are you following right now?', time: 'Mon' },
    { id: 2, from: 'me', text: 'Push/pull/legs, 3x per week', time: 'Mon' },
  ],
  '5': [
    { id: 1, from: 'other', text: 'Great job with your deadlift PR! 160kg', time: 'Sun' },
    { id: 2, from: 'me', text: 'Thanks! Still a long way to go', time: 'Sun' },
  ],
};

const QUICK_REPLIES = ['Great lift!', "Let's train!", "What's your PR?", 'Respect'];

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

// ─── Avatar ───────────────────────────────────────────────────────────────────

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
  const id = parseInt(userId, 10);
  const color = AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length];
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const id = userId ?? '2';
  const user = USER_DATA[id] ?? { name: 'User', level: 1 };
  const isOnline = ONLINE_IDS.includes(id);

  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES[id] ?? []);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { id: Date.now(), from: 'me', text: msg, time },
    ]);
    setInput('');
    inputRef.current?.focus();
  };

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

        <ChatAvatar userId={id} name={user.name} size={40} online={isOnline} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user.name}</Text>
          <Text style={[styles.headerStatus, isOnline && styles.headerStatusOnline]}>
            {isOnline ? 'Online' : 'Offline'}{' · LVL '}{user.level}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {[Phone, MoreHorizontal].map((Icon, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            >
              <Icon size={16} strokeWidth={2} color="#606060" />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageArea}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date divider */}
        <View style={styles.dateDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>TODAY</Text>
          <View style={styles.dividerLine} />
        </View>

        {messages.map((msg, i) => {
          const isMe = msg.from === 'me';
          const showAvatar = !isMe && (i === 0 || messages[i - 1]?.from !== 'other');
          const isLastInGroup = i === messages.length - 1 || messages[i + 1]?.from !== msg.from;
          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
            >
              {!isMe && (
                showAvatar ? (
                  <ChatAvatar userId={id} name={user.name} size={28} />
                ) : (
                  <View style={{ width: 28, flexShrink: 0 }} />
                )
              )}
              <View style={[styles.bubbleGroup, isMe ? styles.bubbleGroupMe : styles.bubbleGroupOther]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                    {msg.text}
                  </Text>
                </View>
                {isLastInGroup && (
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {msg.time}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
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
            onPress={() => sendMessage(q)}
            style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.quickBtnText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <ImagePlus size={16} strokeWidth={2} color="#505050" />
          </Pressable>

          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              placeholder={`Message ${user.name}...`}
              placeholderTextColor={Colors.hint}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={!input.trim()}
              style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : styles.sendBtnInactive]}
            >
              <ArrowUp size={16} strokeWidth={2.5} color={input.trim() ? '#fff' : '#404040'} />
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  dividerText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#404040',
    letterSpacing: 1,
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
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  bubbleTime: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#404040',
    marginTop: 1,
  },
  bubbleTimeMe: {
    alignSelf: 'flex-end',
  },
  quickScroll: {
    flexGrow: 0,
    paddingBottom: 8,
  },
  quickContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
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
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 11,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: Colors.accent,
  },
  sendBtnInactive: {
    backgroundColor: '#242424',
  },
});
