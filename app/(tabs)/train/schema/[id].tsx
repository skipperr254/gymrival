import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const SCHEMA_DATA: Record<string, { name: string; day: string; exercises: { name: string; sets: number; reps: string; weight: number }[] }> = {
  '1': { name: 'Push Day', day: 'Monday', exercises: [
    { name: 'Bench Press', sets: 4, reps: '8–10', weight: 90 },
    { name: 'Overhead Press', sets: 3, reps: '10–12', weight: 60 },
    { name: 'Tricep Dips', sets: 3, reps: '12–15', weight: 0 },
  ]},
  '2': { name: 'Pull Day', day: 'Wednesday', exercises: [
    { name: 'Deadlift', sets: 4, reps: '5–6', weight: 150 },
    { name: 'Pull-ups', sets: 4, reps: '8–10', weight: 0 },
    { name: 'Barbell Row', sets: 3, reps: '10–12', weight: 80 },
  ]},
  '3': { name: 'Leg Day', day: 'Friday', exercises: [
    { name: 'Squat', sets: 5, reps: '5', weight: 130 },
    { name: 'Leg Press', sets: 3, reps: '12–15', weight: 200 },
    { name: 'Calf Raises', sets: 4, reps: '20', weight: 60 },
  ]},
};

export default function SchemaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schema = SCHEMA_DATA[id ?? '1'] ?? SCHEMA_DATA['1'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>{schema.name.toUpperCase()}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dayBadge}>
          <Ionicons name="calendar-outline" size={14} color={Colors.accent} />
          <Text style={styles.dayText}>{schema.day}</Text>
        </View>

        <Text style={styles.sectionLabel}>EXERCISES</Text>
        {schema.exercises.map((ex, i) => (
          <View key={ex.name} style={styles.exRow}>
            <View style={styles.exNum}>
              <Text style={styles.exNumText}>{i + 1}</Text>
            </View>
            <View style={styles.exInfo}>
              <Text style={styles.exName}>{ex.name}</Text>
              <Text style={styles.exDetail}>
                {ex.sets} sets · {ex.reps} reps{ex.weight > 0 ? ` · ${ex.weight} kg` : ' · Bodyweight'}
              </Text>
            </View>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="play" size={16} color={Colors.primary} />
          <Text style={styles.startBtnText}>START SESSION</Text>
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
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 20 },
  dayText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.secondary },
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
