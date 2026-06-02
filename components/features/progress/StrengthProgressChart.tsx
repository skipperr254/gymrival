import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LineChart } from '@/components/ui/LineChart';
import { Colors, Fonts } from '@/constants/theme';
import type { StrengthSeries } from '@/types/progress';

interface StrengthProgressChartProps {
  series: StrengthSeries[];
  bigThreeTotal: StrengthSeries | null;
}

export function StrengthProgressChart({ series, bigThreeTotal }: StrengthProgressChartProps) {
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
          className="text-muted mb-1"
          style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 2 }}
        >
          STRENGTH PROGRESS
        </Text>
        <View className="items-center py-8">
          <Text
            className="text-muted text-center"
            style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 }}
          >
            Log your first PR to see your progress.
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
        className="text-muted mb-3"
        style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 2 }}
      >
        STRENGTH PROGRESS
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
                style={{
                  fontFamily: Fonts.display,
                  fontSize: 11,
                  letterSpacing: 1,
                  color: active ? Colors.primary : Colors.secondary,
                }}
              >
                {s.exerciseKey === 'big3_total' ? 'BIG 3 TOTAL' : s.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Current best */}
      {currentBest !== null && (
        <View className="flex-row items-baseline gap-1 mb-3">
          <Text style={{ fontFamily: Fonts.display, fontSize: 42, color: Colors.primary, lineHeight: 44 }}>
            {currentBest % 1 === 0 ? currentBest : currentBest.toFixed(1)}
          </Text>
          <Text
            className="text-secondary"
            style={{ fontFamily: Fonts.display, fontSize: 18, lineHeight: 20 }}
          >
            {selected.unit.toUpperCase()}
          </Text>
          <Text
            className="text-muted ml-1"
            style={{ fontFamily: Fonts.body, fontSize: 12 }}
          >
            current best
          </Text>
        </View>
      )}

      {/* Line chart */}
      <LineChart points={selected.points} height={130} color={Colors.accent} />
    </View>
  );
}
