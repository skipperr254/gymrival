import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const BADGES: { id: number; icon: IoniconName; label: string; earned: boolean; date?: string; desc?: string }[] = [
  { id: 1, icon: 'trophy', label: 'First PR', earned: true, date: 'Jan 2024' },
  { id: 2, icon: 'flame', label: '7-Day Streak', earned: true, date: 'Feb 2024' },
  { id: 3, icon: 'barbell', label: '100kg Bench', earned: true, date: 'Mar 2024' },
  { id: 4, icon: 'podium', label: 'Top 3 Board', earned: true, date: 'Apr 2024' },
  { id: 5, icon: 'medal', label: '10 PRs', earned: true, date: 'Apr 2024' },
  { id: 6, icon: 'flash', label: 'Challenge Won', earned: true, date: 'May 2024' },
  { id: 7, icon: 'videocam', label: 'Video Proof', earned: false, desc: 'Upload a video to unlock' },
  { id: 8, icon: 'skull', label: '200kg Deadlift', earned: false, desc: '40 kg to go' },
  { id: 9, icon: 'calendar', label: '30-Day Streak', earned: false, desc: '23 days to go' },
  { id: 10, icon: 'heart', label: '100 Likes', earned: false, desc: '67 likes to go' },
];

export default function BadgesScreen() {
  const earned = BADGES.filter((b) => b.earned);
  const locked = BADGES.filter((b) => !b.earned);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>BADGES</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{earned.length}</Text>
          <Text style={styles.summaryLabel}>BADGES EARNED</Text>
        </View>

        {/* Earned */}
        <Text style={styles.sectionLabel}>EARNED</Text>
        <View style={styles.grid}>
          {earned.map((b) => (
            <View key={b.id} style={styles.badge}>
              <View style={styles.badgeIcon}>
                <Ionicons name={b.icon} size={24} color={Colors.warning ?? '#ffaa00'} />
              </View>
              <Text style={styles.badgeLabel}>{b.label}</Text>
              <Text style={styles.badgeDate}>{b.date}</Text>
            </View>
          ))}
        </View>

        {/* Locked */}
        <Text style={styles.sectionLabel}>LOCKED</Text>
        <View style={styles.grid}>
          {locked.map((b) => (
            <View key={b.id} style={[styles.badge, styles.badgeLocked]}>
              <View style={[styles.badgeIcon, styles.badgeIconLocked]}>
                <Ionicons name={b.icon} size={24} color={Colors.hint} />
              </View>
              <Text style={[styles.badgeLabel, styles.badgeLabelLocked]}>{b.label}</Text>
              <Text style={styles.badgeDate}>{b.desc}</Text>
            </View>
          ))}
        </View>
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
  summaryCard: { backgroundColor: Colors.accent, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 24 },
  summaryNum: { fontFamily: Fonts.display, fontSize: 56, color: Colors.primary },
  summaryLabel: { fontFamily: Fonts.display, fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 3 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  badge: { width: '30%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,170,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  badgeIconLocked: { backgroundColor: Colors.elevated },
  badgeLabel: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.primary, textAlign: 'center' },
  badgeLabelLocked: { color: Colors.muted },
  badgeDate: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center' },
});
