import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const CHALLENGES = [
  { id: 'weekly', title: 'BENCH BATTLE', desc: 'Highest bench press PR this week', endsIn: '4 days', participants: 47, accentColor: Colors.accent },
  { id: 'monthly', title: 'MOST IMPROVED', desc: 'Biggest PR gains this month', endsIn: '18 days', participants: 124, accentColor: '#4a9eff' },
];

export default function ChallengesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>CHALLENGES</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ACTIVE CHALLENGES</Text>

        {CHALLENGES.map((ch) => (
          <Pressable
            key={ch.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(Routes.challengeDetail(ch.id) as never)}
          >
            <View style={[styles.cardAccent, { backgroundColor: ch.accentColor }]} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{ch.title}</Text>
              <Text style={styles.cardDesc}>{ch.desc}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.muted} />
                  <Text style={styles.metaText}>{ch.endsIn} left</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={12} color={Colors.muted} />
                  <Text style={styles.metaText}>{ch.participants} joined</Text>
                </View>
              </View>
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
  spacer: { width: 30 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden', gap: 14 },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: 16 },
  cardTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.primary, letterSpacing: 2, marginBottom: 4 },
  cardDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.secondary, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
});
