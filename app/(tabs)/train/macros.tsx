import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const GOALS = { cal: 2400, protein: 180, carbs: 240, fat: 65 };
const TODAY = { cal: 1060, protein: 94, carbs: 126, fat: 16 };

const MEALS = [
  { name: 'Oats + banana', cal: 380, protein: 14, time: '08:00' },
  { name: 'Chicken + rice', cal: 520, protein: 48, time: '13:00' },
  { name: 'Whey shake', cal: 160, protein: 32, time: '16:00' },
];

export default function MacrosScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>MACROS</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calorie ring placeholder */}
        <View style={styles.calCard}>
          <Text style={styles.calLabel}>CALORIES TODAY</Text>
          <View style={styles.calRow}>
            <Text style={styles.calValue}>{TODAY.cal}</Text>
            <Text style={styles.calGoal}> / {GOALS.cal} kcal</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(TODAY.cal / GOALS.cal) * 100}%` }]} />
          </View>
        </View>

        {/* Macro breakdown */}
        <View style={styles.macroRow}>
          {[
            { label: 'PROTEIN', val: TODAY.protein, goal: GOALS.protein, color: Colors.accent },
            { label: 'CARBS', val: TODAY.carbs, goal: GOALS.carbs, color: '#4a9eff' },
            { label: 'FAT', val: TODAY.fat, goal: GOALS.fat, color: Colors.warning ?? '#ffaa00' },
          ].map((m) => (
            <View key={m.label} style={styles.macroItem}>
              <Text style={styles.macroVal}>{m.val}g</Text>
              <Text style={styles.macroGoal}>/{m.goal}g</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Meals */}
        <Text style={styles.sectionLabel}>{"TODAY'S MEALS"}</Text>
        {MEALS.map((meal) => (
          <View key={meal.name} style={styles.mealRow}>
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealTime}>{meal.time}</Text>
            </View>
            <Text style={styles.mealCal}>{meal.cal} kcal</Text>
            <Text style={styles.mealProtein}>{meal.protein}g P</Text>
          </View>
        ))}

        <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>LOG MEAL</Text>
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
  calCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 16 },
  calLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  calRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  calValue: { fontFamily: Fonts.display, fontSize: 48, color: Colors.primary },
  calGoal: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted },
  progressBar: { height: 6, backgroundColor: Colors.elevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3 },
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  macroItem: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  macroVal: { fontFamily: Fonts.display, fontSize: 20, color: Colors.primary },
  macroGoal: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  macroLabel: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 2, color: Colors.muted, marginTop: 4 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 10 },
  mealRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.primary },
  mealTime: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  mealCal: { fontFamily: Fonts.display, fontSize: 14, color: Colors.primary },
  mealProtein: { fontFamily: Fonts.body, fontSize: 11, color: Colors.accent, width: 42, textAlign: 'right' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 16, height: 52, marginTop: 8 },
  addBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
