import { ScrollView, View, Pressable, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import type { ExerciseType } from '@/types/pr';

/**
 * Horizontal chip scroller for picking an exercise. Shared by the
 * friend-challenge modal (CreateChallengeModal) and the admin
 * create-challenge form — extracted so both stay in sync automatically.
 */
export function ExercisePicker({
  exercises,
  value,
  onChange,
}: {
  exercises: ExerciseType[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-1.5 pb-1">
        {exercises.map(ex => {
          const active = value === ex.key;
          const ExIcon = getExerciseIcon(ex.key);
          return (
            <Pressable
              key={ex.key}
              onPress={() => onChange(ex.key)}
              className={`flex-row items-center gap-1.5 py-2 px-3 rounded-[10px] border-[1.5px] justify-center ${
                active
                  ? 'border-accent bg-[rgba(230,48,48,0.1)]'
                  : 'border-default bg-transparent'
              }`}
            >
              <ExIcon size={12} strokeWidth={2} color={active ? Colors.accent : Colors.muted} />
              <Text
                className={`font-heading text-[10px] tracking-[1px] ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                {ex.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
