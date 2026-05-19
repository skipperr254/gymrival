import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const WEIGHT_LOG = [
  { date: '1 May', weight: 76.0 },
  { date: '1 Apr', weight: 77.0 },
  { date: '1 Mar', weight: 78.0 },
  { date: '1 Feb', weight: 80.0 },
  { date: '1 Jan', weight: 82.0 },
];

export default function WeightScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>WEIGHT LOG</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current weight */}
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>CURRENT WEIGHT</Text>
          <View style={styles.currentRow}>
            <Text style={styles.currentValue}>76.0</Text>
            <Text style={styles.currentUnit}>kg</Text>
          </View>
          <Text style={styles.currentDiff}>-6.0 kg since start</Text>
        </View>

        {/* Chart placeholder */}
        <View style={styles.chartPlaceholder}>
          <Ionicons name="analytics" size={24} color={Colors.hint} />
          <Text style={styles.chartPlaceholderText}>Progress chart coming soon</Text>
        </View>

        {/* Log entries */}
        <Text style={styles.sectionLabel}>LOG HISTORY</Text>
        {WEIGHT_LOG.map((entry) => (
          <View key={entry.date} style={styles.logRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.muted} />
            <Text style={styles.logDate}>{entry.date}</Text>
            <Text style={styles.logWeight}>{entry.weight.toFixed(1)} kg</Text>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>LOG WEIGHT</Text>
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
  currentCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 12, alignItems: 'center' },
  currentLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 8 },
  currentRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  currentValue: { fontFamily: Fonts.display, fontSize: 56, color: Colors.primary },
  currentUnit: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },
  currentDiff: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.success ?? '#00cc44', marginTop: 4 },
  chartPlaceholder: { backgroundColor: Colors.surface, borderRadius: 16, height: 120, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  chartPlaceholderText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.hint },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, paddingHorizontal: 16, marginBottom: 6, gap: 10 },
  logDate: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.secondary },
  logWeight: { fontFamily: Fonts.display, fontSize: 18, color: Colors.primary },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 16, height: 52, marginTop: 8 },
  addBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
