import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { Plan } from '@/lib/billing';

interface Props {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  /** Percentage cheaper than paying monthly, already rounded. Null = don't show. */
  savingsPercent: number | null;
  /** Price normalised to a monthly figure, pre-formatted by the store's currency. */
  pricePerMonth: string | null;
  highlighted: boolean;
}

export function PlanCard({
  plan,
  selected,
  onSelect,
  savingsPercent,
  pricePerMonth,
  highlighted,
}: Props) {
  const { t } = useTranslation('paywall');

  // `period` comes from the package type, never from the product id — the
  // yearly product is literally called `gymrival_pro_yearly` because Apple
  // permanently reserved `_annual`, and the UI must not care.
  const periodLabel = t(`plans.${plan.period}`, { defaultValue: t('plans.monthly') });

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-2xl border px-4 py-3.5 mb-2.5 ${
        selected ? 'bg-[#241a1a] border-accent' : 'bg-surface border-elevated'
      }`}
      style={({ pressed }) => pressed && { opacity: 0.82 }}
    >
      {highlighted && (
        <View className="absolute -top-2 right-4 bg-accent rounded-full px-2.5 py-0.5">
          <Text className="font-heading text-[9px] text-primary tracking-[1.5px]">
            {t('plans.bestValue')}
          </Text>
        </View>
      )}

      <View className="flex-row items-center gap-3">
        <View
          className={`w-5 h-5 rounded-full items-center justify-center border-2 ${
            selected ? 'bg-accent border-accent' : 'border-[#444]'
          }`}
        >
          {selected && <Check size={12} color={Colors.primary} strokeWidth={3.5} />}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-heading text-base text-primary tracking-[1.5px]">
              {periodLabel}
            </Text>
            {savingsPercent != null && savingsPercent > 0 && (
              <View className="bg-[#0a3a1a] rounded-full px-2 py-0.5">
                <Text className="font-sans-semibold text-[10px] text-success">
                  {t('plans.save', { percent: savingsPercent })}
                </Text>
              </View>
            )}
          </View>
          {pricePerMonth && (
            <Text className="font-sans text-[11px] text-[#808080] mt-0.5">
              {t('plans.perMonth', { price: pricePerMonth })}
            </Text>
          )}
        </View>

        <View className="items-end">
          <Text className="font-heading text-lg text-primary tracking-[1px]">
            {plan.priceString}
          </Text>
          {plan.trialDays != null && plan.trialDays > 0 && (
            <Text className="font-sans-semibold text-[10px] text-success mt-0.5">
              {t('plans.trialBadge', { count: plan.trialDays })}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
