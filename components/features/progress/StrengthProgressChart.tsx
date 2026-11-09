import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineChart } from '@/components/ui/LineChart';
import { Colors } from '@/constants/theme';
import { formatNumber } from '@/lib/i18n/format';
import type { StrengthSeries } from '@/types/progress';

interface StrengthProgressChartProps {
  series: StrengthSeries[];
  bigThreeTotal: StrengthSeries | null;
}

export function StrengthProgressChart({ series, bigThreeTotal }: StrengthProgressChartProps) {
  const { t } = useTranslation('progress');
  const allSeries: StrengthSeries[] = bigThreeTotal
    ? [bigThreeTotal, ...series]
    : series;

  const [selectedKey, setSelectedKey] = useState<string>(
    allSeries[0]?.exerciseKey ?? ''
  );

  if (allSeries.length === 0) {
    return (
      <View className="bg-surface rounded-2xl p-5 mb-3">
        <Text
          className="text-muted mb-1 font-display text-[10px] tracking-[2px]"
        >
          {t('strengthProgress')}
        </Text>
        <View className="items-center py-8">
          <Text
            className="text-muted text-center font-body text-[13px] leading-[20px]"
          >
            {t('noPrsYet')}
          </Text>
        </View>
      </View>
    );
  }

  const selected = allSeries.find((s) => s.exerciseKey === selectedKey) ?? allSeries[0];
  const currentBest = selected.points.length > 0
    ? selected.points[selected.points.length - 1].value
    : null;

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3">
      <Text
        className="text-muted mb-3 font-display text-[10px] tracking-[2px]"
      >
        {t('strengthProgress')}
      </Text>

      {/* Series selector chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {allSeries.map((s) => {
          const active = s.exerciseKey === selected.exerciseKey;
          return (
            <Pressable
              key={s.exerciseKey}
              onPress={() => setSelectedKey(s.exerciseKey)}
              className={active ? 'bg-accent rounded-full px-4 py-2' : 'rounded-full px-4 py-2'}
              style={active ? undefined : { backgroundColor: Colors.elevated }}
            >
              <Text
                className="font-display text-[11px] tracking-[1px]"
                style={{
                  color: active ? Colors.primary : Colors.secondary,
                }}
              >
                {s.exerciseKey === 'big3_total' ? t('big3Total') : s.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Current best */}
      {currentBest !== null && (
        <View className="flex-row items-baseline gap-1 mb-3">
          <Text className="font-display text-[42px] text-primary leading-[44px]">
            {currentBest % 1 === 0 ? formatNumber(currentBest) : formatNumber(currentBest, { maximumFractionDigits: 1 })}
          </Text>
          <Text
            className="text-secondary font-display text-[18px] leading-[20px]"
          >
            {selected.unit.toUpperCase()}
          </Text>
          <Text
            className="text-muted ml-1 font-body text-[12px]"
          >
            {t('currentBest')}
          </Text>
        </View>
      )}

      {/* Line chart */}
      <LineChart points={selected.points} height={130} color={Colors.accent} />
    </View>
  );
}
