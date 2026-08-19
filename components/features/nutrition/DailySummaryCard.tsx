import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { formatNumber } from '@/lib/i18n/format';
import type { DailyNutritionTotals, NutritionTargets } from '@/types/nutrition';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
}

function MacroBar({ label, consumed, target, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  return (
    <View className="flex-1">
      <View className="flex-row justify-between mb-1.5">
        <Text className="font-heading text-[9px] tracking-[1.5px] text-muted">{label}</Text>
        <Text className="font-sans text-[10px] text-secondary">
          {formatNumber(Math.round(consumed))}/{formatNumber(Math.round(target))}g
        </Text>
      </View>
      <View className="rounded-full overflow-hidden" style={{ height: 5, backgroundColor: Colors.elevated }}>
        <View className="h-full rounded-full" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

interface DailySummaryCardProps {
  totals: DailyNutritionTotals;
  targets: NutritionTargets;
}

export function DailySummaryCard({ totals, targets }: DailySummaryCardProps) {
  const { t } = useTranslation('nutrition');
  const caloriesPct = targets.calories > 0 ? Math.min(1, totals.calories / targets.calories) : 0;
  const remaining = Math.max(0, targets.calories - totals.calories);

  return (
    <View className="bg-surface rounded-2xl p-4 mb-4">
      <View className="flex-row items-end justify-between mb-2">
        <View>
          <Text
            className="text-muted mb-1"
            style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 2 }}
          >
            {t('summary.calories')}
          </Text>
          <Text style={{ fontFamily: Fonts.display, fontSize: 40, color: Colors.accent, lineHeight: 42 }}>
            {formatNumber(Math.round(totals.calories))}
          </Text>
        </View>
        <Text className="text-secondary mb-1" style={{ fontFamily: Fonts.body, fontSize: 12 }}>
          {t('summary.remaining', { value: formatNumber(Math.round(remaining)) })}
        </Text>
      </View>

      <View className="rounded-full overflow-hidden mb-4" style={{ height: 6, backgroundColor: Colors.elevated }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.round(caloriesPct * 100)}%`, backgroundColor: Colors.accent }}
        />
      </View>

      <View className="flex-row gap-4">
        <MacroBar label={t('summary.protein')} consumed={totals.protein_g} target={targets.protein_g} color={Colors.friend} />
        <MacroBar label={t('summary.carbs')} consumed={totals.carbs_g} target={targets.carbs_g} color={Colors.warning} />
        <MacroBar label={t('summary.fat')} consumed={totals.fat_g} target={targets.fat_g} color={Colors.success} />
      </View>
    </View>
  );
}
