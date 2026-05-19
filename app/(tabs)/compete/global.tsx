import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const GLOBAL_USERS = [
  { name: 'ThijsLifts', country: 'NL', total: 700 },
  { name: 'PowerPiet', country: 'NL', total: 645 },
  { name: 'IronJan', country: 'BE', total: 605 },
  { name: 'You', country: 'NL', total: 400, isMe: true },
  { name: 'StrengthSven', country: 'DE', total: 385 },
];

export default function GlobalLeaderboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>GLOBAL</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>GLOBAL LEADERBOARD</Text>
        <Text style={styles.subLabel}>Top performers worldwide — Bench + Squat + Deadlift total</Text>

        {GLOBAL_USERS.map((u, i) => (
          <View key={u.name} style={[styles.row, u.isMe && styles.rowMe]}>
            <Text style={styles.rank}>
              {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
            </Text>
            <View style={[styles.avatar, u.isMe && styles.avatarMe]}>
              <Text style={styles.avatarText}>{u.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, u.isMe && styles.nameMe]}>{u.name}</Text>
              <Text style={styles.country}>{u.country}</Text>
            </View>
            <Text style={styles.value}>{u.total} kg</Text>
          </View>
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
  sectionLabel: { fontFamily: Fonts.display, fontSize: 13, letterSpacing: 3, color: Colors.muted, marginBottom: 4 },
  subLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.hint, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 12, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  rowMe: { backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: Colors.accentRing },
  rank: { fontFamily: Fonts.display, fontSize: 16, color: '#d4a017', width: 24, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarMe: { backgroundColor: Colors.accentDark },
  avatarText: { fontFamily: Fonts.display, fontSize: 11, color: Colors.primary },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  nameMe: { color: Colors.accent },
  country: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  value: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary },
});
