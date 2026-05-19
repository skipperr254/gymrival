import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const INSIGHTS = [
  { icon: 'trending-up' as const, title: 'Deadlift growing fast!', text: 'Your deadlift has risen 15 kg in the last 3 months. Keep this volume up.', color: Colors.accent },
  { icon: 'warning' as const, title: 'Bench press plateau', text: 'Your bench has been stuck at 100 kg for 3 weeks. Try a deload week or add more incline volume.', color: Colors.warning ?? '#ffaa00' },
  { icon: 'moon' as const, title: 'Rest day recommended', text: "You've trained 5 days in a row. Your body needs rest for optimal recovery.", color: Colors.muted },
];

export default function CoachScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>AI COACH</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.coachAvatar}>
            <Ionicons name="sparkles" size={28} color={Colors.primary} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>YOUR AI COACH</Text>
            <Text style={styles.introSub}>Personalised insights powered by Anthropic Claude</Text>
          </View>
        </View>

        {/* Insights */}
        <Text style={styles.sectionLabel}>{"THIS WEEK'S INSIGHTS"}</Text>
        {INSIGHTS.map((ins) => (
          <View key={ins.title} style={[styles.insightCard, { borderLeftColor: ins.color }]}>
            <Ionicons name={ins.icon} size={18} color={ins.color} />
            <View style={styles.insightBody}>
              <Text style={styles.insightTitle}>{ins.title}</Text>
              <Text style={styles.insightText}>{ins.text}</Text>
            </View>
          </View>
        ))}

        {/* Chat CTA */}
        <Pressable style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
          <Text style={styles.chatBtnText}>ASK YOUR COACH</Text>
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
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.accent, borderRadius: 20, padding: 20, marginBottom: 24, gap: 16 },
  coachAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1 },
  introTitle: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2, marginBottom: 4 },
  introSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, gap: 14, borderLeftWidth: 3 },
  insightBody: { flex: 1 },
  insightTitle: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary, marginBottom: 4 },
  insightText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.secondary, lineHeight: 18 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 16, height: 52, marginTop: 8 },
  chatBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
