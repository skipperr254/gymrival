import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const WOD_EXERCISES = [
  { name: 'Bench Press', sets: 4, reps: '8–10', weight: '80% 1RM' },
  { name: 'Incline Dumbbell', sets: 3, reps: '12', weight: 'Moderate' },
  { name: 'Overhead Press', sets: 3, reps: '10', weight: '70% 1RM' },
  { name: 'Tricep Dips', sets: 3, reps: '15', weight: 'Bodyweight' },
  { name: 'Cable Flyes', sets: 3, reps: '15', weight: 'Light' },
];

export default function WodScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>WOD</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleCard}>
          <Text style={styles.wodTitle}>PUSH DAY BLAST</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={Colors.muted} />
              <Text style={styles.metaText}>45–60 min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={Colors.muted} />
              <Text style={styles.metaText}>234 doing this</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="star-outline" size={13} color={Colors.muted} />
              <Text style={styles.metaText}>Intermediate</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>EXERCISES</Text>
        {WOD_EXERCISES.map((ex, i) => (
          <View key={ex.name} style={styles.exRow}>
            <View style={styles.exNum}>
              <Text style={styles.exNumText}>{i + 1}</Text>
            </View>
            <View style={styles.exInfo}>
              <Text style={styles.exName}>{ex.name}</Text>
              <Text style={styles.exDetail}>{ex.sets} sets · {ex.reps} reps · {ex.weight}</Text>
            </View>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="flash" size={18} color={Colors.primary} />
          <Text style={styles.startBtnText}>START WORKOUT</Text>
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
  titleCard: { backgroundColor: Colors.accent, borderRadius: 20, padding: 20, marginBottom: 20 },
  wodTitle: { fontFamily: Fonts.display, fontSize: 28, color: Colors.primary, letterSpacing: 3, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, gap: 14 },
  exNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accentRing, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontFamily: Fonts.display, fontSize: 14, color: Colors.accent },
  exInfo: { flex: 1 },
  exName: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  exDetail: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 16, height: 52, marginTop: 16 },
  startBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
