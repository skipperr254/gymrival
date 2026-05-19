import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Pull-ups', 'Overhead Press'];
const PR_GAINS = [
  { exercise: 'Bench Press', start: 75, current: 100, gain: 25 },
  { exercise: 'Squat', start: 100, current: 140, gain: 40 },
  { exercise: 'Deadlift', start: 120, current: 160, gain: 40 },
  { exercise: 'Pull-ups', start: 8, current: 15, unit: 'reps', gain: 7 },
];

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>PROGRESS</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exScroll} contentContainerStyle={styles.exScrollContent}>
          {EXERCISES.map((ex, i) => (
            <Pressable key={ex} style={[styles.exPill, i === 0 && styles.exPillActive]}>
              <Text style={[styles.exPillText, i === 0 && styles.exPillTextActive]}>{ex}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Chart placeholder */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>BENCH PRESS · 12 MONTHS</Text>
          <View style={styles.chartArea}>
            <Ionicons name="trending-up" size={32} color={Colors.accent} />
            <Text style={styles.chartPlaceholderText}>Progress chart · +25 kg</Text>
          </View>
          <View style={styles.chartStats}>
            <View style={styles.chartStat}>
              <Text style={styles.chartStatVal}>75 kg</Text>
              <Text style={styles.chartStatLabel}>START</Text>
            </View>
            <View style={styles.chartStat}>
              <Text style={[styles.chartStatVal, { color: Colors.accent }]}>100 kg</Text>
              <Text style={styles.chartStatLabel}>CURRENT PR</Text>
            </View>
          </View>
        </View>

        {/* All gains */}
        <Text style={styles.sectionLabel}>ALL PR GAINS</Text>
        {PR_GAINS.map((pr) => (
          <View key={pr.exercise} style={styles.gainRow}>
            <View style={styles.gainInfo}>
              <Text style={styles.gainExercise}>{pr.exercise}</Text>
              <Text style={styles.gainRange}>{pr.start} → {pr.current} {pr.unit ?? 'kg'}</Text>
            </View>
            <View style={styles.gainBadge}>
              <Text style={styles.gainText}>+{pr.gain} {pr.unit ?? 'kg'}</Text>
            </View>
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
  content: { paddingBottom: 96 },
  exScroll: { marginBottom: 16 },
  exScrollContent: { paddingHorizontal: 16, gap: 8 },
  exPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface },
  exPillActive: { backgroundColor: Colors.accent },
  exPillText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.muted },
  exPillTextActive: { color: Colors.primary },
  chartCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginHorizontal: 16, marginBottom: 20 },
  chartTitle: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 16 },
  chartArea: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.base, borderRadius: 12, marginBottom: 16 },
  chartPlaceholderText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.secondary },
  chartStats: { flexDirection: 'row', justifyContent: 'space-between' },
  chartStat: { alignItems: 'center' },
  chartStatVal: { fontFamily: Fonts.display, fontSize: 22, color: Colors.primary },
  chartStatLabel: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 2, color: Colors.muted, marginTop: 2 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10, paddingHorizontal: 16 },
  gainRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 8, gap: 14 },
  gainInfo: { flex: 1 },
  gainExercise: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  gainRange: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  gainBadge: { backgroundColor: Colors.accentRing, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  gainText: { fontFamily: Fonts.display, fontSize: 14, color: Colors.accent },
});
