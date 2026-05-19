import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const PR_HISTORY = [
  { exercise: 'Bench Press', entries: [
    { date: '12 May 2025', value: 100, unit: 'kg' },
    { date: '3 Apr 2025', value: 97, unit: 'kg' },
    { date: '15 Feb 2025', value: 95, unit: 'kg' },
  ]},
  { exercise: 'Squat', entries: [
    { date: '10 May 2025', value: 140, unit: 'kg' },
    { date: '1 Apr 2025', value: 138, unit: 'kg' },
  ]},
  { exercise: 'Deadlift', entries: [
    { date: '8 May 2025', value: 160, unit: 'kg' },
    { date: '20 Mar 2025', value: 158, unit: 'kg' },
  ]},
  { exercise: 'Pull-ups', entries: [
    { date: '5 May 2025', value: 15, unit: 'reps' },
    { date: '10 Feb 2025', value: 12, unit: 'reps' },
  ]},
];

export default function PRHistoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>PR HISTORY</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {PR_HISTORY.map((group) => (
          <View key={group.exercise} style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons name="trophy" size={14} color={Colors.accent} />
              <Text style={styles.groupLabel}>{group.exercise.toUpperCase()}</Text>
              <Text style={styles.groupBest}>
                Best: {group.entries[0].value} {group.entries[0].unit}
              </Text>
            </View>
            {group.entries.map((e, i) => (
              <View key={e.date} style={styles.prRow}>
                {i === 0 && (
                  <View style={styles.crownIcon}>
                    <Ionicons name="trophy" size={12} color={Colors.warning ?? '#ffaa00'} />
                  </View>
                )}
                {i > 0 && <View style={styles.crownSpacer} />}
                <Text style={styles.prDate}>{e.date}</Text>
                <Text style={[styles.prValue, i === 0 && styles.prValueBest]}>
                  {e.value} {e.unit}
                </Text>
              </View>
            ))}
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
  group: { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.elevated, padding: 14, paddingHorizontal: 16 },
  groupLabel: { flex: 1, fontFamily: Fonts.display, fontSize: 13, color: Colors.primary, letterSpacing: 2 },
  groupBest: { fontFamily: Fonts.display, fontSize: 13, color: Colors.accent },
  prRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated, gap: 10 },
  crownIcon: { width: 20, alignItems: 'center' },
  crownSpacer: { width: 20 },
  prDate: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.secondary },
  prValue: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary },
  prValueBest: { color: Colors.accent },
});
