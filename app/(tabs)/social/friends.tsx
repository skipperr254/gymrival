import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const FRIENDS = [
  { id: 2, name: 'Daan', username: '@daanfit', level: 10 },
  { id: 3, name: 'Sara', username: '@sara_lifts', level: 14 },
  { id: 4, name: 'Mike', username: '@mike_gains', level: 8 },
  { id: 5, name: 'Lisa', username: '@lisastrong', level: 11 },
];

export default function FriendsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>FRIENDS</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>YOUR FRIENDS</Text>

        {FRIENDS.map((f) => (
          <Pressable
            key={f.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(Routes.chat(String(f.id)) as never)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{f.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{f.name}</Text>
              <Text style={styles.username}>{f.username}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {f.level}</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.muted} />
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
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 13, color: Colors.primary },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  username: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  levelBadge: { backgroundColor: Colors.elevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  levelText: { fontFamily: Fonts.display, fontSize: 10, color: Colors.accent, letterSpacing: 1 },
});
