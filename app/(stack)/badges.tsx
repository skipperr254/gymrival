import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Trophy, Flame, Dumbbell, Award, Medal, Zap, Video, Skull, Calendar, Heart,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { DetailHeader } from '@/components/ui/DetailHeader';

interface BadgeDef {
  id: number;
  icon: LucideIcon;
  labelKey: string;
  earned: boolean;
  date?: string;
  descKey?: string;
}

const BADGES: BadgeDef[] = [
  { id: 1, icon: Trophy, labelKey: 'badges.items.firstPr', earned: true, date: 'Jan 2024' },
  { id: 2, icon: Flame, labelKey: 'badges.items.sevenDayStreak', earned: true, date: 'Feb 2024' },
  { id: 3, icon: Dumbbell, labelKey: 'badges.items.hundredKgBench', earned: true, date: 'Mar 2024' },
  { id: 4, icon: Award, labelKey: 'badges.items.topThreeBoard', earned: true, date: 'Apr 2024' },
  { id: 5, icon: Medal, labelKey: 'badges.items.tenPrs', earned: true, date: 'Apr 2024' },
  { id: 6, icon: Zap, labelKey: 'badges.items.challengeWon', earned: true, date: 'May 2024' },
  { id: 7, icon: Video, labelKey: 'badges.items.videoProof', earned: false, descKey: 'badges.desc.videoProof' },
  { id: 8, icon: Skull, labelKey: 'badges.items.twoHundredKgDeadlift', earned: false, descKey: 'badges.desc.deadlift' },
  { id: 9, icon: Calendar, labelKey: 'badges.items.thirtyDayStreak', earned: false, descKey: 'badges.desc.streak30' },
  { id: 10, icon: Heart, labelKey: 'badges.items.hundredLikes', earned: false, descKey: 'badges.desc.likes100' },
];

export default function BadgesScreen() {
  const { t } = useTranslation('profile');
  const earned = BADGES.filter((b) => b.earned);
  const locked = BADGES.filter((b) => !b.earned);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('badges.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View className="bg-accent rounded-[20px] p-5 items-center mb-6">
          <Text className="font-heading text-primary text-[56px]">{earned.length}</Text>
          <Text className="font-heading text-[12px] text-white/75 tracking-[3px]">
            {t('badges.earnedCount')}
          </Text>
        </View>

        {/* Earned */}
        <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-3">
          {t('badges.earnedSection')}
        </Text>
        <View className="flex-row flex-wrap gap-2.5 mb-6">
          {earned.map((b) => (
            <View key={b.id} className="w-[30%] grow bg-surface rounded-2xl p-3.5 items-center gap-1.5">
              <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-[rgba(255,170,0,0.15)]">
                <b.icon size={24} color={Colors.warning} />
              </View>
              <Text className="font-sans-medium text-[12px] text-primary text-center">
                {t(b.labelKey)}
              </Text>
              <Text className="font-sans text-[10px] text-muted text-center">{b.date}</Text>
            </View>
          ))}
        </View>

        {/* Locked */}
        <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-3">
          {t('badges.lockedSection')}
        </Text>
        <View className="flex-row flex-wrap gap-2.5 mb-6">
          {locked.map((b) => (
            <View
              key={b.id}
              className="w-[30%] grow bg-surface rounded-2xl p-3.5 items-center gap-1.5 opacity-50"
            >
              <View className="w-[52px] h-[52px] rounded-full items-center justify-center bg-elevated">
                <b.icon size={24} color={Colors.hint} />
              </View>
              <Text className="font-sans-medium text-[12px] text-muted text-center">
                {t(b.labelKey)}
              </Text>
              <Text className="font-sans text-[10px] text-muted text-center">
                {b.descKey ? t(b.descKey) : ''}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 96 },
});
