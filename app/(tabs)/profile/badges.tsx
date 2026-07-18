import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="p-1 mr-2"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text className="font-heading text-2xl text-primary tracking-[3px] flex-1">
          {t('badges.title')}
        </Text>
        <View className="w-[30px]" />
      </View>

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
                <Ionicons name={b.icon} size={24} color={Colors.warning ?? '#ffaa00'} />
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
                <Ionicons name={b.icon} size={24} color={Colors.hint} />
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
