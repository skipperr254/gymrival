import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Dumbbell, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { LeaderboardAvatar, MEDAL_COLORS } from './LeaderboardAvatar';
import { styles, rivalsStyles } from './styles';

export function RivalsContent() {
  const { t } = useTranslation('compete');
  const { user } = useAuthStore();
  const {
    exercises,
    selectedExercise,
    rivals,
    loadingExercises,
    loadingRivals,
    loadExercises,
    loadRivals,
    setSelectedExercise,
  } = useCompeteStore();

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
              style={[styles.chip, active && styles.chipActive]}
            >
              <Dumbbell size={12} strokeWidth={2} color={active ? '#000' : '#555'} />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {exercise.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 16 }} />

      {isLoading && (
        <View style={rivalsStyles.loadingBox}>
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      )}

      {!isLoading && rivals.length === 0 && (
        <View style={rivalsStyles.emptyBox}>
          <Trophy size={32} strokeWidth={1.4} color="#333" />
          <Text style={rivalsStyles.emptyTitle}>{t('rivals.emptyTitle')}</Text>
          <Text style={rivalsStyles.emptySub}>{t('rivals.emptySub')}</Text>
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
            style={[styles.row, rival.isMe ? styles.rowMe : styles.rowOther]}
          >
            <View style={styles.rankBox}>
              {index < 3 ? (
                <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[index]} />
              ) : (
                <Text style={styles.rankNum}>#{index + 1}</Text>
              )}
            </View>
            <LeaderboardAvatar id={rival.userId} name={displayName} size={42} />
            <View style={styles.rowCenter}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, rival.isMe && styles.userNameMe]}>
                  {displayName.toUpperCase()}
                </Text>
                {rival.isMe && <Text style={styles.youTag}>{t('you')}</Text>}
              </View>
              <View style={[styles.barTrack, rival.isMe && styles.barTrackMe]}>
                {rival.isMe ? (
                  <View style={[styles.barFillMe, { width: pct }]} />
                ) : (
                  <LinearGradient
                    colors={['#e63030', '#ff6b6b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFillOther, { width: pct }]}
                  />
                )}
              </View>
            </View>
            <View style={styles.prBox}>
              <Text style={[styles.prValue, { color: prColor }]}>{rival.bestPR}</Text>
              <Text style={[styles.prUnit, rival.isMe && styles.prUnitMe]}>
                {(selectedEx?.unit ?? rival.unit).toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}

      {!isLoading && rivals.length > 0 && (
        <Text style={styles.footerNote}>{t('rivals.footerNote')}</Text>
      )}
    </>
  );
}
