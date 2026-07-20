import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import type { TrainingSessionWithExercises } from '@/types/train';
import { DAYS_SHORT } from './constants';

interface ScheduleListProps {
  sessions: TrainingSessionWithExercises[];
  loading: boolean;
  onOpenDetail: (s: TrainingSessionWithExercises) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ScheduleList({ sessions, loading, onOpenDetail, onDelete, onNew }: ScheduleListProps) {
  const { t } = useTranslation('train');

  const sessionDay = (s: TrainingSessionWithExercises): string => {
    if (s.day_of_week == null) return t('flexible');
    return t(`days.full.${s.day_of_week}`);
  };
  const dayHasWorkout = (i: number) => sessions.some((s) => s.day_of_week === i);
  const workoutForDay = (i: number) => sessions.find((s) => s.day_of_week === i);

  return (
    <>
      {/* Loading skeleton */}
      {loading && sessions.length === 0 && (
        <View className="py-5 items-center">
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      )}

      {/* Weekly Calendar */}
      <View className="flex-row gap-1.5 bg-surface rounded-[20px] p-4 mb-3.5">
        {DAYS_SHORT.map((day, i) => {
          const has = dayHasWorkout(i);
          const workout = workoutForDay(i);
          return (
            <Pressable
              key={day}
              className="flex-1 items-center"
              onPress={() => workout && onOpenDetail(workout)}
              disabled={!has}
            >
              <View
                className={`w-full aspect-square rounded-[10px] items-center justify-center mb-1 ${
                  has ? 'bg-accent' : 'bg-base'
                }`}
              >
                {has ? (
                  <Ionicons name="barbell" size={14} color={Colors.primary} />
                ) : (
                  <View className="w-1 h-1 rounded-sm bg-[#333]" />
                )}
              </View>
              <Text
                className={`font-heading text-[9px] tracking-[1px] ${
                  has ? 'text-accent' : 'text-muted'
                }`}
              >
                {t(`days.short.${i}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Section label + NEW button */}
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="font-heading text-xs tracking-[3px] text-muted">
          {t('workoutsPlanned', { count: sessions.length })}
        </Text>
        <Pressable
          className="flex-row items-center gap-1.5 py-1.5 px-3.5 rounded-full border-[1.5px] border-accent bg-accent-ring"
          style={({ pressed }) => pressed && { opacity: 0.7 }}
          onPress={onNew}
        >
          <Ionicons name="add" size={14} color={Colors.accent} />
          <Text className="font-heading text-[11px] tracking-[1.5px] text-accent">{t('new')}</Text>
        </Pressable>
      </View>

      {/* Session list */}
      {sessions.map((s) => (
        <Pressable
          key={s.id}
          className="flex-row items-center gap-3 bg-surface rounded-2xl py-3.5 px-4 mb-2.5 border-[1.5px] border-default"
          style={({ pressed }) => pressed && { opacity: 0.75 }}
          onPress={() => onOpenDetail(s)}
        >
          <View className="w-[46px] h-[46px] rounded-2xl bg-base items-center justify-center">
            <Ionicons name="barbell" size={22} color={Colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-heading text-[17px] tracking-[2px] text-primary" numberOfLines={1}>
              {s.name.toUpperCase()}
            </Text>
            <Text className="font-sans text-xs text-muted">
              {t('workoutMeta', { day: sessionDay(s), count: s.exercises.length })}
            </Text>
          </View>
          <Pressable
            className="p-1.5 rounded-lg"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 0.4 })}
            onPress={() => onDelete(s.id)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} style={rtlIconFlip} />
        </Pressable>
      ))}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <View className="items-center p-10 bg-surface rounded-[20px] border-[1.5px] border-default border-dashed">
          <Ionicons
            name="barbell-outline"
            size={40}
            color={Colors.muted}
            style={{ opacity: 0.4, marginBottom: 14 }}
          />
          <Text className="font-heading text-base tracking-[3px] text-primary mb-1.5">
            {t('emptyTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted text-center">{t('emptySubtitle')}</Text>
        </View>
      )}
    </>
  );
}
