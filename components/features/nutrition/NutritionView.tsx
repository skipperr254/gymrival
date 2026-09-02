import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Target, ChevronRight } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import { resolveTargets } from '@/lib/nutrition';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useNutritionStore, todayTotals } from '@/store/useNutritionStore';
import type { MealType } from '@/types/nutrition';
import { DailySummaryCard } from './DailySummaryCard';
import { MealSection } from './MealSection';
import { LogFoodSheet } from './LogFoodSheet';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Renders inside the parent ScrollView in train.tsx — no nested ScrollView needed.
export function NutritionView() {
  const { t } = useTranslation('nutrition');
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const todayLogs = useNutritionStore((s) => s.todayLogs);
  const loading = useNutritionStore((s) => s.loading);
  const loadNutritionData = useNutritionStore((s) => s.loadNutritionData);
  const removeMealLog = useNutritionStore((s) => s.removeMealLog);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMealType, setSheetMealType] = useState<MealType>('breakfast');

  useEffect(() => {
    if (!user?.id) return;
    loadNutritionData(user.id);
    if (!profile) loadProfile(user.id);
  }, [user?.id]);

  const openLogSheet = (mealType: MealType) => {
    setSheetMealType(mealType);
    setSheetVisible(true);
  };

  if (loading && todayLogs.length === 0 && !profile) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  }

  const targets = profile ? resolveTargets(profile) : null;
  const totals = todayTotals(todayLogs);

  return (
    <View>
      {targets ? (
        <>
          <DailySummaryCard totals={totals} targets={targets} />
          <Pressable
            onPress={() => router.push(Routes.nutritionGoals)}
            className="flex-row items-center justify-between mb-4 px-1"
          >
            <Text className="font-sans text-xs text-muted">{t('editGoals')}</Text>
            <ChevronRight size={14} color={Colors.hint} style={rtlIconFlip} />
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => router.push(Routes.nutritionGoals)}
          className="bg-surface rounded-2xl p-5 mb-4 items-center"
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <View className="w-11 h-11 rounded-2xl bg-[rgba(230,48,48,0.1)] items-center justify-center mb-3">
            <Target size={20} color={Colors.accent} />
          </View>
          <Text
            className="text-primary mb-1.5 text-center"
            style={{ fontFamily: Fonts.display, fontSize: 16, letterSpacing: 2 }}
          >
            {t('setGoalsTitle')}
          </Text>
          <Text className="text-muted text-center" style={{ fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 }}>
            {t('setGoalsSub')}
          </Text>
        </Pressable>
      )}

      {MEAL_TYPES.map((mt) => (
        <MealSection
          key={mt}
          mealType={mt}
          logs={todayLogs.filter((l) => l.meal_type === mt)}
          onAdd={openLogSheet}
          onRemove={removeMealLog}
        />
      ))}

      <LogFoodSheet visible={sheetVisible} initialMealType={sheetMealType} onClose={() => setSheetVisible(false)} />
    </View>
  );
}
