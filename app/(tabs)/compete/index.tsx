import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const PLACEHOLDER_USERS = [
  { name: 'Sara', rank: 1, value: '105 kg' },
  { name: 'You', rank: 2, value: '100 kg', isMe: true },
  { name: 'Daan', rank: 3, value: '102 kg' },
  { name: 'Mike', rank: 4, value: '98 kg' },
];

export default function CompeteScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>COMPETE</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL 12</Text>
          </View>
        </View>

        {/* Segment navigation */}
        <View style={styles.segRow}>
          <View style={[styles.seg, styles.segActive]}>
            <Text style={[styles.segLabel, styles.segLabelActive]}>FRIENDS</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.seg, pressed && styles.segPressed]}
            onPress={() => router.push(Routes.competeGlobal)}
          >
            <Text style={styles.segLabel}>GLOBAL</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.seg, pressed && styles.segPressed]}
            onPress={() => router.push(Routes.competeChallenges)}
          >
            <Text style={styles.segLabel}>CHALLENGES</Text>
          </Pressable>
        </View>

        {/* Exercise selector hint */}
        <View style={styles.exerciseRow}>
          {['Bench Press', 'Squat', 'Deadlift', 'Pull-ups'].map((ex, i) => (
            <View key={ex} style={[styles.exPill, i === 0 && styles.exPillActive]}>
              <Text style={[styles.exPillText, i === 0 && styles.exPillTextActive]}>
                {ex}
              </Text>
            </View>
          ))}
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>FRIENDS LEADERBOARD</Text>

        {/* Placeholder rows */}
        {PLACEHOLDER_USERS.map((u) => (
          <View key={u.name} style={[styles.row, u.isMe && styles.rowMe]}>
            <Text style={styles.rank}>
              {u.rank <= 3 ? ['🥇', '🥈', '🥉'][u.rank - 1] : `#${u.rank}`}
            </Text>
            <View style={[styles.avatar, u.isMe && styles.avatarMe]}>
              <Text style={styles.avatarText}>{u.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={[styles.rowName, u.isMe && styles.rowNameMe]}>{u.name}</Text>
            <Text style={styles.rowValue}>{u.value}</Text>
          </View>
        ))}

        {/* Navigation hint */}
        <Pressable
          style={({ pressed }) => [styles.navHint, pressed && { opacity: 0.6 }]}
          onPress={() => router.push(Routes.challengeDetail('weekly') as never)}
        >
          <Ionicons name="trophy-outline" size={16} color={Colors.accent} />
          <Text style={styles.navHintText}>View Weekly Challenge</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heading: { fontFamily: Fonts.display, fontSize: 36, color: Colors.primary, letterSpacing: 3 },
  levelBadge: { backgroundColor: Colors.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { fontFamily: Fonts.display, fontSize: 12, color: Colors.accent, letterSpacing: 2 },
  segRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 3, gap: 2, marginBottom: 20 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segActive: { backgroundColor: Colors.elevated },
  segPressed: { opacity: 0.6 },
  segLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1.5, color: Colors.muted },
  segLabelActive: { color: Colors.primary },
  exerciseRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  exPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface },
  exPillActive: { backgroundColor: Colors.accent },
  exPillText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.muted },
  exPillTextActive: { color: Colors.primary },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 12, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
  rowMe: { backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: Colors.accentRing },
  rank: { fontFamily: Fonts.display, fontSize: 16, color: Colors.warning ?? '#ffaa00', width: 24, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarMe: { backgroundColor: Colors.accentDark },
  avatarText: { fontFamily: Fonts.display, fontSize: 12, color: Colors.primary },
  rowName: { flex: 1, fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  rowNameMe: { color: Colors.accent },
  rowValue: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary },
  navHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginTop: 8 },
  navHintText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.secondary },
});
