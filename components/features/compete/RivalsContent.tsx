import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Dumbbell, RefreshCw, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { LeaderboardAvatar, MEDAL_COLORS } from './LeaderboardAvatar';

export function RivalsContent() {
  const { t } = useTranslation('compete');
  const user = useAuthStore((s) => s.user);
  // Per-field selectors — avoids re-rendering this tab on unrelated compete
  // store changes (global leaderboard pages, challenge loads, etc.)
  const exercises = useCompeteStore((s) => s.exercises);
  const selectedExercise = useCompeteStore((s) => s.selectedExercise);
  const rivals = useCompeteStore((s) => s.rivals);
  const loadingExercises = useCompeteStore((s) => s.loadingExercises);
  const loadingRivals = useCompeteStore((s) => s.loadingRivals);
  const error = useCompeteStore((s) => s.error);
  const loadExercises = useCompeteStore((s) => s.loadExercises);
  const loadRivals = useCompeteStore((s) => s.loadRivals);
  const setSelectedExercise = useCompeteStore((s) => s.setSelectedExercise);

  useEffect(() => {
    if (!user?.id) return;
    loadExercises();
    loadRivals(user.id);
  }, [user?.id, loadExercises, loadRivals]);

  const maxPR = rivals[0]?.bestPR ?? 1;
  const selectedEx = exercises.find(e => e.key === selectedExercise);
  const isLoading = loadingExercises || loadingRivals;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {exercises.map(exercise => {
          const active = selectedExercise === exercise.key;
          return (
            <Pressable
              key={exercise.key}
              onPress={() => user?.id && setSelectedExercise(exercise.key, user.id)}
              className={`flex-row items-center gap-[5px] py-[7px] px-3 rounded-full border-[1.5px] ${
                active ? 'border-white bg-white' : 'border-[#2a2a2a] bg-transparent'
              }`}
            >
              <Dumbbell size={12} strokeWidth={2} color={active ? '#000' : '#555'} />
              <Text
                className={`font-heading text-[11px] tracking-[1px] ${
                  active ? 'text-black' : 'text-[#555]'
                }`}
              >
                {exercise.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 16 }} />

      {isLoading && (
        <View className="items-center py-12">
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      )}

      {!isLoading && rivals.length === 0 && error && (
        <View className="items-center bg-[rgba(230,48,48,0.06)] rounded-2xl border border-[rgba(230,48,48,0.2)] py-7 px-5 gap-2">
          <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-[#b0b0b0]">{t('rivals.loadError')}</Text>
          <Pressable
            onPress={() => user?.id && loadRivals(user.id)}
            className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
          >
            <RefreshCw size={13} strokeWidth={2} color="#fff" />
            <Text className="font-heading text-xs tracking-[2px] text-white">
              {t('rivals.retry')}
            </Text>
          </Pressable>
        </View>
      )}

      {!isLoading && rivals.length === 0 && !error && (
        <View className="items-center bg-[#1e1e1e] rounded-2xl py-12 px-5 gap-2">
          <Trophy size={32} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('rivals.emptyTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-[#555] text-center">
            {t('rivals.emptySub')}
          </Text>
        </View>
      )}

      {!isLoading && rivals.map((rival, index) => {
        const isFirst = index === 0;
        const prColor = isFirst ? (rival.isMe ? '#000' : Colors.accent) : rival.isMe ? '#333' : '#fff';
        const pct = `${Math.round((rival.bestPR / maxPR) * 100)}%` as `${number}%`;
        const displayName = rival.fullName || rival.username || t('unknown');

        return (
          <View
            key={rival.userId}
            className={`flex-row items-center gap-3 rounded-2xl py-3.5 px-4 mb-2.5 ${
              rival.isMe ? 'bg-white' : 'bg-[#1e1e1e] border border-[#2a2a2a]'
            }`}
            style={rival.isMe ? { transform: [{ scale: 1.025 }] } : undefined}
          >
            <View className="w-7 items-center shrink-0">
              {index < 3 ? (
                <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[index]} />
              ) : (
                <Text className="font-heading text-[13px] text-[#505050]">#{index + 1}</Text>
              )}
            </View>
            <LeaderboardAvatar id={rival.userId} name={displayName} size={42} />
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center mb-[5px]">
                <Text
                  className={`font-heading text-[15px] tracking-[1px] ${
                    rival.isMe ? 'text-black' : 'text-white'
                  }`}
                >
                  {displayName.toUpperCase()}
                </Text>
                {rival.isMe && (
                  <Text className="font-heading text-[9px] text-accent ml-2 tracking-[1px]">
                    {t('you')}
                  </Text>
                )}
              </View>
              <View
                className={`h-1 rounded overflow-hidden ${
                  rival.isMe ? 'bg-black/10' : 'bg-[#2a2a2a]'
                }`}
              >
                {rival.isMe ? (
                  <View className="h-1 rounded bg-black" style={{ width: pct }} />
                ) : (
                  <LinearGradient
                    colors={['#e63030', '#ff6b6b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 4, borderRadius: 4, width: pct }}
                  />
                )}
              </View>
            </View>
            <View className="items-end shrink-0">
              <Text className="font-heading text-[28px] leading-7" style={{ color: prColor }}>
                {rival.bestPR}
              </Text>
              <Text
                className={`font-heading text-[9px] tracking-[1px] ${
                  rival.isMe ? 'text-[#888]' : 'text-[#505050]'
                }`}
              >
                {(selectedEx?.unit ?? rival.unit).toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}

      {!isLoading && rivals.length > 0 && (
        <Text className="text-center pt-4 pb-2 font-heading text-[10px] text-[#383838] tracking-[2px]">
          {t('rivals.footerNote')}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
});
