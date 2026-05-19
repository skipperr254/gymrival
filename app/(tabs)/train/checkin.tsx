import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const GYMS = [
  { name: 'Basic-Fit Amsterdam Zuid', distance: '0.3 km', checkedIn: 12 },
  { name: 'Sportschool Olympus', distance: '0.8 km', checkedIn: 5 },
  { name: 'Fit For Free', distance: '1.2 km', checkedIn: 8 },
];

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHECKED = [true, false, true, false, true, true, false];

export default function CheckinScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>CHECK-IN</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>THIS WEEK</Text>
          <View style={styles.weekRow}>
            {WEEK.map((d, i) => (
              <View key={i} style={[styles.dayDot, CHECKED[i] && styles.dayDotActive]}>
                <Text style={[styles.dayLabel, CHECKED[i] && styles.dayLabelActive]}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.streakSub}>4 sessions this week</Text>
        </View>

        {/* Nearby gyms */}
        <Text style={styles.sectionLabel}>NEARBY GYMS</Text>
        {GYMS.map((gym) => (
          <Pressable
            key={gym.name}
            style={({ pressed }) => [styles.gymRow, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.gymIcon}>
              <Ionicons name="barbell" size={18} color={Colors.accent} />
            </View>
            <View style={styles.gymInfo}>
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.gymMeta}>{gym.distance} · {gym.checkedIn} checked in</Text>
            </View>
            <View style={styles.checkBtn}>
              <Text style={styles.checkBtnText}>CHECK IN</Text>
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
  streakCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 24 },
  streakTitle: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 14 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: Colors.accent },
  dayLabel: { fontFamily: Fonts.display, fontSize: 12, color: Colors.muted },
  dayLabelActive: { color: Colors.primary },
  streakSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.secondary },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  gymRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, paddingHorizontal: 16, marginBottom: 8, gap: 14 },
  gymIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentRing, alignItems: 'center', justifyContent: 'center' },
  gymInfo: { flex: 1 },
  gymName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.primary },
  gymMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  checkBtn: { backgroundColor: Colors.elevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  checkBtnText: { fontFamily: Fonts.display, fontSize: 10, color: Colors.accent, letterSpacing: 1 },
});
