import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, withAlpha } from '@/constants/theme';
import type { CheckinDay } from '@/types/progress';

const CELL = 18;
const GAP = 3;
const LABEL_W = 16;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const WEEKS = 12;

function cellColor(count: number, isFuture: boolean): string {
  if (isFuture || count === 0) return Colors.elevated;
  if (count === 1) return withAlpha(Colors.accent, 0.55);
  return Colors.accent;
}

interface GridCell {
  date: string;
  count: number;
  isFuture: boolean;
}

function buildGrid(checkins: CheckinDay[]): GridCell[][] {
  const countMap = new Map<string, number>(checkins.map((c) => [c.date, c.count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mon=0 ... Sun=6
  const dow = (today.getDay() + 6) % 7;
  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - dow);

  const startOfGrid = new Date(startOfCurrentWeek);
  startOfGrid.setDate(startOfCurrentWeek.getDate() - (WEEKS - 1) * 7);

  return Array.from({ length: WEEKS }, (_, col) =>
    Array.from({ length: 7 }, (_, row) => {
      const d = new Date(startOfGrid);
      d.setDate(startOfGrid.getDate() + col * 7 + row);
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        isFuture: d > today,
      };
    })
  );
}

interface ConsistencyHeatmapProps {
  checkins: CheckinDay[];
}

export function ConsistencyHeatmap({ checkins }: ConsistencyHeatmapProps) {
  const { t } = useTranslation('progress');
  const grid = useMemo(() => buildGrid(checkins), [checkins]);
  const totalCheckins = checkins.reduce((sum, c) => sum + c.count, 0);

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-muted font-display text-[10px] tracking-[2px]"
        >
          {t('consistency')}
        </Text>
        <Text
          className="text-secondary font-body text-[11px]"
        >
          {t('checkinsIn12Weeks', { count: totalCheckins })}
        </Text>
      </View>

      <View className="flex-row" style={{ gap: GAP }}>
        {/* Day labels */}
        <View style={{ gap: GAP, width: LABEL_W }}>
          {DAY_LABELS.map((d, i) => (
            <View
              className="justify-center items-end"
              key={i}
              style={{ height: CELL, paddingRight: 3 }}
            >
              <Text className="font-display text-[8px] text-muted">
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Week columns */}
        {grid.map((week, col) => (
          <View className="flex-1" key={col} style={{ gap: GAP }}>
            {week.map((cell, row) => (
              <View
                className="rounded-[3px]"
                key={row}
                style={{
                  height: CELL,
                  backgroundColor: cellColor(cell.count, cell.isFuture),
                  opacity: cell.isFuture ? 0.3 : 1,
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-end gap-2 mt-3">
        <Text className="font-body text-[9px] text-muted">{t('less')}</Text>
        {[0, 1, 2].map((lvl) => (
          <View
            className="w-2.5 h-2.5 rounded-[2px]"
            key={lvl}
            style={{
              backgroundColor: cellColor(lvl, false),
            }}
          />
        ))}
        <Text className="font-body text-[9px] text-muted">{t('more')}</Text>
      </View>
    </View>
  );
}
