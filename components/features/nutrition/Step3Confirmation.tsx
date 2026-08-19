import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { MealType } from '@/types/nutrition';

interface Step3ConfirmationProps {
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function Step3Confirmation({ name, mealType, calories, proteinG, carbsG, fatG }: Step3ConfirmationProps) {
  const { t } = useTranslation('nutrition');

  return (
    <View className="items-center pt-6 pb-4">
      <View className="w-24 h-24 rounded-full border-2 border-[rgba(0,204,68,0.3)] items-center justify-center mb-5">
        <LinearGradient
          colors={['#00cc44', '#009933']}
          style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Check size={36} strokeWidth={2.6} color={Colors.primary} />
        </LinearGradient>
      </View>

      <Text className="font-heading text-[28px] tracking-[3px] text-primary mb-1.5">{t('logSheet.mealLogged')}</Text>
      <Text className="font-heading text-[13px] tracking-[2px] text-success mb-6">
        {t('logSheet.addedToMeal', { meal: t(`mealTypes.${mealType}`) })}
      </Text>

      <View className="w-full bg-[rgba(0,204,68,0.06)] border border-[rgba(0,204,68,0.22)] rounded-2xl py-5 px-6 items-center gap-1.5">
        <Text className="font-heading text-base text-primary tracking-[0.5px] text-center">{name}</Text>
        <Text className="font-sans text-xs text-secondary text-center">
          {t('logSheet.macroSummary', { calories, protein: proteinG, carbs: carbsG, fat: fatG })}
        </Text>
      </View>
    </View>
  );
}
