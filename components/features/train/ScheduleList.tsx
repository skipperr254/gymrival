import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { TrainingSessionWithExercises } from '@/types/train';
import { DAYS_SHORT } from './constants';
import { styles } from './styles';

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
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      )}

      {/* Weekly Calendar */}
      <View style={styles.calendarCard}>
        {DAYS_SHORT.map((day, i) => {
          const has = dayHasWorkout(i);
          const workout = workoutForDay(i);
          return (
            <Pressable
              key={day}
              style={styles.dayCol}
              onPress={() => workout && onOpenDetail(workout)}
              disabled={!has}
            >
              <View style={[styles.dayDot, has && styles.dayDotActive]}>
                {has ? (
                  <Ionicons name="barbell" size={14} color={Colors.primary} />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
              <Text style={[styles.dayLabel, has && styles.dayLabelActive]}>
                {t(`days.short.${i}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Section label + NEW button */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {t('workoutsPlanned', { count: sessions.length })}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.7 }]}
          onPress={onNew}
        >
          <Ionicons name="add" size={14} color={Colors.accent} />
          <Text style={styles.newBtnText}>{t('new')}</Text>
        </Pressable>
      </View>

      {/* Session list */}
      {sessions.map((s) => (
        <Pressable
          key={s.id}
          style={({ pressed }) => [styles.workoutCard, pressed && { opacity: 0.75 }]}
          onPress={() => onOpenDetail(s)}
        >
          <View style={styles.workoutIconWrap}>
            <Ionicons name="barbell" size={22} color={Colors.accent} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{s.name.toUpperCase()}</Text>
            <Text style={styles.workoutMeta}>
              {t('workoutMeta', { day: sessionDay(s), count: s.exercises.length })}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.9 : 0.4 }]}
            onPress={() => onDelete(s.id)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </Pressable>
      ))}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons
            name="barbell-outline"
            size={40}
            color={Colors.muted}
            style={{ opacity: 0.4, marginBottom: 14 }}
          />
          <Text style={styles.emptyTitle}>{t('emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('emptySubtitle')}</Text>
        </View>
      )}
    </>
  );
}
