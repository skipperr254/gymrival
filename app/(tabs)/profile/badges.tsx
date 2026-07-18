import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BadgeDef {
  id: number;
  icon: IoniconName;
  labelKey: string;
  earned: boolean;
  date?: string;
  descKey?: string;
}

const BADGES: BadgeDef[] = [
  { id: 1, icon: 'trophy', labelKey: 'badges.items.firstPr', earned: true, date: 'Jan 2024' },
  { id: 2, icon: 'flame', labelKey: 'badges.items.sevenDayStreak', earned: true, date: 'Feb 2024' },
  { id: 3, icon: 'barbell', labelKey: 'badges.items.hundredKgBench', earned: true, date: 'Mar 2024' },
  { id: 4, icon: 'podium', labelKey: 'badges.items.topThreeBoard', earned: true, date: 'Apr 2024' },
  { id: 5, icon: 'medal', labelKey: 'badges.items.tenPrs', earned: true, date: 'Apr 2024' },
  { id: 6, icon: 'flash', labelKey: 'badges.items.challengeWon', earned: true, date: 'May 2024' },
  { id: 7, icon: 'videocam', labelKey: 'badges.items.videoProof', earned: false, descKey: 'badges.desc.videoProof' },
  { id: 8, icon: 'skull', labelKey: 'badges.items.twoHundredKgDeadlift', earned: false, descKey: 'badges.desc.deadlift' },
  { id: 9, icon: 'calendar', labelKey: 'badges.items.thirtyDayStreak', earned: false, descKey: 'badges.desc.streak30' },
  { id: 10, icon: 'heart', labelKey: 'badges.items.hundredLikes', earned: false, descKey: 'badges.desc.likes100' },
];

export default function BadgesScreen() {
  const { t } = useTranslation('profile');
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
        <Text style={styles.heading}>{t('badges.title')}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{earned.length}</Text>
          <Text style={styles.summaryLabel}>{t('badges.earnedCount')}</Text>
        </View>

        {/* Earned */}
        <Text style={styles.sectionLabel}>{t('badges.earnedSection')}</Text>
        <View style={styles.grid}>
          {earned.map((b) => (
            <View key={b.id} style={styles.badge}>
              <View style={styles.badgeIcon}>
                <Ionicons name={b.icon} size={24} color={Colors.warning ?? '#ffaa00'} />
              </View>
              <Text style={styles.badgeLabel}>{t(b.labelKey)}</Text>
              <Text style={styles.badgeDate}>{b.date}</Text>
            </View>
          ))}
        </View>

        {/* Locked */}
        <Text style={styles.sectionLabel}>{t('badges.lockedSection')}</Text>
        <View style={styles.grid}>
          {locked.map((b) => (
            <View key={b.id} style={[styles.badge, styles.badgeLocked]}>
              <View style={[styles.badgeIcon, styles.badgeIconLocked]}>
                <Ionicons name={b.icon} size={24} color={Colors.hint} />
              </View>
              <Text style={[styles.badgeLabel, styles.badgeLabelLocked]}>{t(b.labelKey)}</Text>
              <Text style={styles.badgeDate}>{b.descKey ? t(b.descKey) : ''}</Text>
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
