import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { TrainingSessionWithExercises } from '@/types/train';
import { styles } from './styles';

interface WorkoutDetailProps {
  session: TrainingSessionWithExercises;
  workoutStarted: boolean;
  completedSets: Record<string, boolean>;
  totalSets: number;
  doneSets: number;
  allDone: boolean;
  onToggleSet: (exIdx: number, setIdx: number) => void;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

export function WorkoutDetail({
  session,
  workoutStarted,
  completedSets,
  totalSets,
  doneSets,
  allDone,
  onToggleSet,
  onStart,
  onFinish,
  onCancel,
}: WorkoutDetailProps) {
  const { t } = useTranslation('train');

  const sessionDay = (s: TrainingSessionWithExercises): string => {
    if (s.day_of_week == null) return t('flexible');
    return t(`days.full.${s.day_of_week}`);
  };

  return (
    <>
      {/* Detail header card */}
      <View style={styles.detailCard}>
        <View style={styles.detailCardTop}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="barbell" size={26} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{session.name.toUpperCase()}</Text>
            <Text style={styles.detailMeta}>
              {t('detailMeta', { day: sessionDay(session).toUpperCase(), count: session.exercises.length })}
            </Text>
          </View>
        </View>

        {workoutStarted && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{t('progressLabel')}</Text>
              <Text style={styles.progressLabel}>{t('setsProgress', { done: doneSets, total: totalSets })}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: doneSets }]} />
              <View style={{ flex: Math.max(totalSets - doneSets, 0) }} />
            </View>
          </>
        )}
      </View>

      {/* Exercise list */}
      {session.exercises.map((ex, i) => (
        <View key={ex.id} style={styles.exCard}>
          <View style={[styles.exCardTop, workoutStarted && { marginBottom: 12 }]}>
            <View style={[styles.exIcon, workoutStarted && styles.exIconActive]}>
              <Ionicons
                name="pulse"
                size={18}
                color={workoutStarted ? Colors.accent : Colors.muted}
              />
            </View>
            <View style={styles.exInfo}>
              <Text style={styles.exName}>{ex.exercise_name}</Text>
              <Text style={styles.exMeta}>
                {(ex.target_weight ?? 0) > 0
                  ? t('exerciseMetaWithWeight', { sets: ex.sets, reps: ex.reps, weight: ex.target_weight })
                  : t('exerciseMeta', { sets: ex.sets, reps: ex.reps })}
              </Text>
            </View>
            {!workoutStarted && (
              <View style={styles.exBadge}>
                <Text style={styles.exBadgeText}>{`${ex.sets}×${ex.reps}`}</Text>
              </View>
            )}
          </View>

          {workoutStarted && (
            <View style={styles.setsRow}>
              {Array.from({ length: ex.sets }).map((_, j) => {
                const done = !!completedSets[`${i}-${j}`];
                return (
                  <Pressable
                    key={j}
                    style={({ pressed }) => [
                      styles.setBtn,
                      done && styles.setBtnDone,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => onToggleSet(i, j)}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={14} color={Colors.accent} />
                    ) : (
                      <Text style={styles.setBtnLabel}>{t('setNumber', { n: j + 1 })}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {/* CTAs */}
      {!workoutStarted ? (
        <Pressable
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
          onPress={onStart}
        >
          <Ionicons name="flash" size={18} color={Colors.primary} />
          <Text style={styles.startBtnText}>{t('startWorkout')}</Text>
        </Pressable>
      ) : allDone ? (
        <View style={styles.doneCard}>
          <Ionicons name="trophy" size={42} color={Colors.success} style={{ marginBottom: 12 }} />
          <Text style={styles.doneTitle}>{t('workoutDone')}</Text>
          <Text style={styles.doneSub}>{t('workoutDoneSub')}</Text>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
            onPress={onFinish}
          >
            <Text style={styles.doneBtnText}>{t('backToSchedule')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
          onPress={onCancel}
        >
          <Ionicons name="close" size={15} color={Colors.muted} />
          <Text style={styles.cancelBtnText}>{t('cancelWorkout')}</Text>
        </Pressable>
      )}
    </>
  );
}
