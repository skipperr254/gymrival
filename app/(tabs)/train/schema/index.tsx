import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const SCHEMAS = [
  { id: 1, name: 'Push Day', day: 'Monday', exercises: 3 },
  { id: 2, name: 'Pull Day', day: 'Wednesday', exercises: 3 },
  { id: 3, name: 'Leg Day', day: 'Friday', exercises: 3 },
];

export default function SchemasScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>MY SCHEMA</Text>
        <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.5 }]}>
          <Ionicons name="add" size={22} color={Colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>TRAINING PROGRAMS</Text>

        {SCHEMAS.map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(Routes.schemaDetail(String(s.id)) as never)}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="barbell" size={20} color={Colors.accent} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{s.name}</Text>
              <Text style={styles.cardSub}>{s.day} · {s.exercises} exercises</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.hint} />
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
  addBtn: { padding: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, gap: 14 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.accentRing, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.primary },
  cardSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
});
