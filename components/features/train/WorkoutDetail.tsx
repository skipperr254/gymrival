import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { TrainingSessionWithExercises } from '@/types/train';

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
      <View className="bg-black rounded-[20px] p-5 mb-3.5">
        <View className="flex-row items-center gap-3.5 mb-3">
          <View className="w-[50px] h-[50px] rounded-2xl bg-[rgba(230,48,48,0.12)] border border-[rgba(230,48,48,0.25)] items-center justify-center">
            <Ionicons name="barbell" size={26} color={Colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-heading text-2xl tracking-[3px] text-primary">
              {session.name.toUpperCase()}
            </Text>
            <Text className="font-sans text-xs text-secondary tracking-[2px]">
              {t('detailMeta', { day: sessionDay(session).toUpperCase(), count: session.exercises.length })}
            </Text>
          </View>
        </View>

        {workoutStarted && (
          <>
            <View className="flex-row justify-between mb-1.5">
              <Text className="font-heading text-[11px] tracking-[1px] text-muted">
                {t('progressLabel')}
              </Text>
              <Text className="font-heading text-[11px] tracking-[1px] text-muted">
                {t('setsProgress', { done: doneSets, total: totalSets })}
              </Text>
            </View>
            <View className="h-1 bg-white/[0.08] rounded overflow-hidden flex-row">
              <View className="bg-accent rounded" style={{ flex: doneSets }} />
              <View style={{ flex: Math.max(totalSets - doneSets, 0) }} />
            </View>
          </>
        )}
      </View>

      {/* Exercise list */}
      {session.exercises.map((ex, i) => (
        <View key={ex.id} className="bg-surface rounded-2xl py-3.5 px-4 mb-2.5">
          <View className={`flex-row items-center gap-3 ${workoutStarted ? 'mb-3' : ''}`}>
            <View
              className={`w-[42px] h-[42px] rounded-xl items-center justify-center border ${
                workoutStarted
                  ? 'bg-[rgba(230,48,48,0.1)] border-[rgba(230,48,48,0.3)]'
                  : 'bg-base border-default'
              }`}
            >
              <Ionicons
                name="pulse"
                size={18}
                color={workoutStarted ? Colors.accent : Colors.muted}
              />
            </View>
            <View className="flex-1">
              <Text className="font-sans-semibold text-[15px] text-primary mb-0.5">
                {ex.exercise_name}
              </Text>
              <Text className="font-sans text-xs text-muted">
                {(ex.target_weight ?? 0) > 0
                  ? t('exerciseMetaWithWeight', { sets: ex.sets, reps: ex.reps, weight: ex.target_weight })
                  : t('exerciseMeta', { sets: ex.sets, reps: ex.reps })}
              </Text>
            </View>
            {!workoutStarted && (
              <View className="bg-base border border-default rounded-[10px] py-1.5 px-3">
                <Text className="font-heading text-[17px] text-primary">{`${ex.sets}×${ex.reps}`}</Text>
              </View>
            )}
          </View>

          {workoutStarted && (
            <View className="flex-row gap-2">
              {Array.from({ length: ex.sets }).map((_, j) => {
                const done = !!completedSets[`${i}-${j}`];
                return (
                  <Pressable
                    key={j}
                    className={`flex-1 py-2.5 px-1.5 rounded-[10px] items-center justify-center border-[1.5px] ${
                      done
                        ? 'border-accent bg-[rgba(230,48,48,0.12)]'
                        : 'border-default bg-base'
                    }`}
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                    onPress={() => onToggleSet(i, j)}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={14} color={Colors.accent} />
                    ) : (
                      <Text className="font-heading text-[11px] tracking-[1px] text-muted">
                        {t('setNumber', { n: j + 1 })}
                      </Text>
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
          className="flex-row items-center justify-center gap-2.5 bg-accent rounded-2xl h-[52px] mt-1.5"
          style={({ pressed }) => pressed && { opacity: 0.85 }}
          onPress={onStart}
        >
          <Ionicons name="flash" size={18} color={Colors.primary} />
          <Text className="font-heading text-[15px] tracking-[3px] text-primary">
            {t('startWorkout')}
          </Text>
        </Pressable>
      ) : allDone ? (
        <View className="bg-[#0a1f0a] border border-[#1a3a1a] rounded-2xl p-6 items-center mt-1.5">
          <Ionicons name="trophy" size={42} color={Colors.success} style={{ marginBottom: 12 }} />
          <Text className="font-heading text-[22px] tracking-[3px] text-primary mb-1">
            {t('workoutDone')}
          </Text>
          <Text className="font-sans text-[13px] text-muted mb-[18px]">{t('workoutDoneSub')}</Text>
          <Pressable
            className="bg-accent rounded-xl py-3 px-7"
            style={({ pressed }) => pressed && { opacity: 0.8 }}
            onPress={onFinish}
          >
            <Text className="font-heading text-sm tracking-[2px] text-primary">
              {t('backToSchedule')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          className="flex-row items-center justify-center gap-2 border-[1.5px] border-default rounded-2xl h-[52px] mt-1.5"
          style={({ pressed }) => pressed && { opacity: 0.75 }}
          onPress={onCancel}
        >
          <Ionicons name="close" size={15} color={Colors.muted} />
          <Text className="font-heading text-[13px] tracking-[2px] text-muted">
            {t('cancelWorkout')}
          </Text>
        </Pressable>
      )}
    </>
  );
}
