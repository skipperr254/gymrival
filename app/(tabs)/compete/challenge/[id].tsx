import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const CHALLENGE_DATA: Record<string, { title: string; desc: string; endsIn: string; participants: number; prize: string }> = {
  weekly: { title: 'BENCH BATTLE', desc: 'Who posts the highest bench press PR this week?', endsIn: '4 days', participants: 47, prize: 'Gold badge + 500 XP' },
  monthly: { title: 'MOST IMPROVED', desc: 'Who makes the biggest PR gains this month?', endsIn: '18 days', participants: 124, prize: 'Platinum badge + 2000 XP' },
};

const LEADERBOARD = [
  { name: 'Sara', value: '105 kg' },
  { name: 'Daan', value: '102 kg' },
  { name: 'You', value: '100 kg', isMe: true },
  { name: 'Mike', value: '98 kg' },
  { name: 'Lisa', value: '92 kg' },
];

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ch = CHALLENGE_DATA[id ?? 'weekly'] ?? CHALLENGE_DATA.weekly;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>CHALLENGE</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ch.title}</Text>
          <Text style={styles.cardDesc}>{ch.desc}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>PRIZE</Text>
              <Text style={styles.metaVal}>{ch.prize}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>ENDS IN</Text>
              <Text style={styles.metaValLg}>{ch.endsIn}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>JOINED</Text>
              <Text style={styles.metaValLg}>{ch.participants}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>LEADERBOARD</Text>
        {LEADERBOARD.map((p, i) => (
          <View key={p.name} style={[styles.row, p.isMe && styles.rowMe]}>
            <Text style={styles.rank}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</Text>
            <View style={[styles.avatar, p.isMe && styles.avatarMe]}>
              <Text style={styles.avatarText}>{p.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={[styles.rowName, p.isMe && styles.rowNameMe]}>{p.name}</Text>
            <Text style={styles.rowValue}>{p.value}</Text>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.joinBtn, pressed && { opacity: 0.8 }]}>
          <Text style={styles.joinBtnText}>JOIN CHALLENGE</Text>
        </Pressable>
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
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 20 },
  cardTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  cardDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.secondary, lineHeight: 20, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { gap: 2 },
  metaKey: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 2, color: Colors.muted },
  metaVal: { fontFamily: Fonts.body, fontSize: 12, color: Colors.accent },
  metaValLg: { fontFamily: Fonts.display, fontSize: 18, color: Colors.primary },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 12, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  rowMe: { backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: Colors.accentRing },
  rank: { fontFamily: Fonts.display, fontSize: 16, color: '#d4a017', width: 24, textAlign: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarMe: { backgroundColor: Colors.accentDark },
  avatarText: { fontFamily: Fonts.display, fontSize: 11, color: Colors.primary },
  rowName: { flex: 1, fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  rowNameMe: { color: Colors.accent },
  rowValue: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary },
  joinBtn: { backgroundColor: Colors.accent, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  joinBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
