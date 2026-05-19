import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const USER_NAMES: Record<string, string> = { '2': 'Daan', '3': 'Sara', '4': 'Mike', '5': 'Lisa' };

const MESSAGES = [
  { id: 1, from: 'other', text: 'Bro, have you tried close-grip bench yet?' },
  { id: 2, from: 'me', text: 'Yeah! Felt the triceps way more. You should try it 💪' },
  { id: 3, from: 'other', text: 'Nice! When are you training next?' },
  { id: 4, from: 'me', text: 'Tonight, leg day 🦵' },
];

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const name = USER_NAMES[userId ?? '2'] ?? 'User';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.heading}>{name.toUpperCase()}</Text>
        <View style={styles.spacer} />
      </View>

      {/* Messages */}
      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        {MESSAGES.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.from === 'me' ? styles.bubbleMe : styles.bubbleOther]}
          >
            <Text style={[styles.bubbleText, msg.from === 'me' && styles.bubbleTextMe]}>
              {msg.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={Colors.hint}
            editable={false}
          />
          <Pressable style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="send" size={18} color={Colors.primary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.elevated },
  back: { padding: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 11, color: Colors.primary },
  heading: { fontFamily: Fonts.display, fontSize: 18, color: Colors.primary, letterSpacing: 2, flex: 1 },
  spacer: { width: 30 },
  messages: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12, paddingHorizontal: 14 },
  bubbleMe: { backgroundColor: Colors.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.secondary, lineHeight: 20 },
  bubbleTextMe: { color: Colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontFamily: Fonts.body, fontSize: 14, color: Colors.primary, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
});
