import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const CONVERSATIONS = [
  { id: 2, name: 'Daan', lastMsg: 'When are you training next?', time: '10:35', unread: 1 },
  { id: 3, name: 'Sara', lastMsg: 'Yes!! 18 pull-ups is insane 🔥', time: 'Yesterday', unread: 0 },
  { id: 4, name: 'Mike', lastMsg: 'Push/pull/legs, 3x per week', time: 'Mon', unread: 0 },
  { id: 5, name: 'Lisa', lastMsg: 'Thanks! Still a long way to go', time: 'Sun', unread: 0 },
];

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>MESSAGES</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {CONVERSATIONS.map((conv) => (
          <Pressable
            key={conv.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(Routes.chat(String(conv.id)) as never)}
          >
            <View style={[styles.avatar, conv.unread > 0 && styles.avatarUnread]}>
              <Text style={styles.avatarText}>{conv.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{conv.name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMsg}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.time}>{conv.time}</Text>
              {conv.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{conv.unread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  heading: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary, letterSpacing: 3, flex: 1 },
  spacer: { width: 30 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarUnread: { backgroundColor: Colors.accentDark },
  avatarText: { fontFamily: Fonts.display, fontSize: 13, color: Colors.primary },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  lastMsg: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontFamily: Fonts.body, fontSize: 11, color: Colors.hint },
  badge: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: Fonts.display, fontSize: 10, color: Colors.primary },
});
