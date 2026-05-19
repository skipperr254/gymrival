import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const SCANS = [
  { date: '1 Jan', weight: 82, fat: 18, muscle: 42, label: 'Start' },
  { date: '1 Feb', weight: 80, fat: 16, muscle: 43, label: 'Month 1' },
  { date: '1 Mar', weight: 78, fat: 14, muscle: 44, label: 'Month 2' },
  { date: '1 Apr', weight: 77, fat: 13, muscle: 45, label: 'Month 3' },
  { date: '1 May', weight: 76, fat: 12, muscle: 46, label: 'Month 4' },
];

export default function BodyScanScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>BODY SCAN</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionLabel}>CURRENT STATS</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'WEIGHT', value: '76 kg' },
              { label: 'BODY FAT', value: '12%' },
              { label: 'MUSCLE', value: '46%' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Progress trend */}
        <View style={styles.trendCard}>
          <Text style={styles.trendLabel}>PROGRESS TREND</Text>
          <Text style={styles.trendStat}>
            -6 kg <Text style={styles.trendPositive}>body weight</Text>
          </Text>
          <Text style={styles.trendStat}>
            -6% <Text style={styles.trendPositive}>body fat</Text>
          </Text>
          <Text style={styles.trendStat}>
            +4% <Text style={styles.trendPositive}>muscle mass</Text>
          </Text>
        </View>

        {/* Scan history */}
        <Text style={styles.histLabel}>SCAN HISTORY</Text>
        {SCANS.map((scan) => (
          <View key={scan.date} style={styles.scanRow}>
            <View style={styles.scanDate}>
              <Text style={styles.scanDateText}>{scan.date}</Text>
              <Text style={styles.scanLabelText}>{scan.label}</Text>
            </View>
            <Text style={styles.scanStat}>{scan.weight}kg</Text>
            <Text style={styles.scanStat}>{scan.fat}% fat</Text>
            <Text style={styles.scanStat}>{scan.muscle}% M</Text>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>ADD SCAN</Text>
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
  statsCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 12 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: Fonts.display, fontSize: 28, color: Colors.primary },
  statLabel: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 2, color: Colors.muted, marginTop: 4 },
  trendCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 20, gap: 4 },
  trendLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 8 },
  trendStat: { fontFamily: Fonts.display, fontSize: 18, color: Colors.primary },
  trendPositive: { fontFamily: Fonts.display, fontSize: 12, color: Colors.success ?? '#00cc44' },
  histLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  scanRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, paddingHorizontal: 14, marginBottom: 6, gap: 12 },
  scanDate: { flex: 1 },
  scanDateText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.primary },
  scanLabelText: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  scanStat: { fontFamily: Fonts.body, fontSize: 12, color: Colors.secondary, width: 52, textAlign: 'right' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 16, height: 52, marginTop: 8 },
  addBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
