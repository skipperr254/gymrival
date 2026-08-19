import { View, Text, Pressable, Alert } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { MealLog, MealType } from '@/types/nutrition';

interface MealSectionProps {
  mealType: MealType;
  logs: MealLog[];
  onAdd: (mealType: MealType) => void;
  onRemove: (mealLogId: string) => void;
}

export function MealSection({ mealType, logs, onAdd, onRemove }: MealSectionProps) {
  const { t } = useTranslation('nutrition');
  const totalCalories = logs.reduce((sum, l) => sum + l.calories, 0);

  const confirmRemove = (log: MealLog) => {
    Alert.alert(t('mealSection.deleteTitle'), t('mealSection.deleteMessage', { name: log.name }), [
      { text: t('mealSection.cancel'), style: 'cancel' },
      { text: t('mealSection.delete'), style: 'destructive', onPress: () => onRemove(log.id) },
    ]);
  };

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-2">
          <Text className="font-heading text-sm tracking-[1.5px] text-primary">{t(`mealTypes.${mealType}`)}</Text>
          {totalCalories > 0 && (
            <Text className="font-sans text-[11px] text-muted">{t('mealSection.calorieCount', { value: Math.round(totalCalories) })}</Text>
          )}
        </View>
        <Pressable
          onPress={() => onAdd(mealType)}
          hitSlop={8}
          className="w-7 h-7 rounded-full bg-elevated items-center justify-center"
        >
          <Plus size={15} strokeWidth={2.4} color={Colors.accent} />
        </Pressable>
      </View>

      {logs.length === 0 ? (
        <Text className="font-sans text-xs text-muted">{t('mealSection.empty')}</Text>
      ) : (
        <View className="gap-2">
          {logs.map((log) => (
            <Pressable
              key={log.id}
              onLongPress={() => confirmRemove(log)}
              className="flex-row items-center justify-between bg-base rounded-xl py-2.5 px-3"
            >
              <View className="flex-1 pr-2">
                <Text className="font-sans-medium text-[13px] text-primary" numberOfLines={1}>
                  {log.name}
                </Text>
                <Text className="font-sans text-[10px] text-muted mt-0.5">
                  {t('logSheet.macroSummary', {
                    calories: log.calories,
                    protein: log.protein_g,
                    carbs: log.carbs_g,
                    fat: log.fat_g,
                  })}
                </Text>
              </View>
              <Pressable onPress={() => confirmRemove(log)} hitSlop={10} className="p-1">
                <X size={14} color={Colors.hint} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
