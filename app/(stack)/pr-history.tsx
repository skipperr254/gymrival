import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { formatDate } from '@/lib/i18n/format';
import { BackButton } from '@/components/ui/BackButton';
import type { PRHistoryGroup } from '@/types/pr';

function PRGroup({ group }: { group: PRHistoryGroup }) {
  const { t } = useTranslation('profile');
  const ExIcon = getExerciseIcon(group.exercise.key);
  return (
    <View className="bg-surface rounded-2xl mb-3 overflow-hidden">
      <View className="flex-row items-center gap-2 bg-elevated py-3.5 px-4">
        <ExIcon size={14} color={Colors.accent} />
        <Text className="flex-1 font-heading text-[13px] text-primary tracking-[2px]">
          {group.exercise.label.toUpperCase()}
        </Text>
        <Text className="font-heading text-[13px] text-accent">
          {t('prHistory.best', { value: group.best, unit: group.exercise.unit })}
        </Text>
      </View>
      {group.entries.map((entry, i) => (
        <View
          key={entry.id}
          className="flex-row items-center py-3 px-4 gap-2.5"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated }}
        >
          {i === 0 ? (
            <View className="w-5 items-center">
              <Trophy size={12} color={Colors.warning} />
            </View>
          ) : (
            <View className="w-5" />
          )}
          <Text className="flex-1 font-sans text-[13px] text-secondary">
            {formatDate(entry.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <Text
            className={`font-heading text-base ${
              entry.value === group.best ? 'text-accent' : 'text-primary'
            }`}
          >
            {entry.value} {entry.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PRHistoryScreen() {
  const { t } = useTranslation('profile');
  const { user } = useAuthStore();
  const { prHistory, loadPRHistory, prHistoryLoading } = useProfileStore();

  useEffect(() => {
    if (user?.id) loadPRHistory(user.id);
  }, [user?.id, loadPRHistory]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <BackButton />
        <Text className="font-heading text-2xl text-primary tracking-[3px] flex-1 ml-1">
          {t('prHistory.title')}
        </Text>
        <View className="w-[30px]" />
      </View>

      {prHistoryLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      ) : prHistory.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-2.5">
          <Trophy size={40} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-xl tracking-[2px] text-primary">
            {t('prHistory.emptyTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted text-center">
            {t('prHistory.emptySub')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {prHistory.map((group) => (
            <PRGroup key={group.exercise.key} group={group} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 96 },
});
