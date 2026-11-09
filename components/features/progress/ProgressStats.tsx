import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ProgressStats as Stats } from '@/types/progress';

// level = GREATEST(1, floor((xp + 50) / 500) + 1) — from DB triggers
function xpBounds(level: number): { start: number; end: number } {
  const start = level === 1 ? 0 : (level - 1) * 500 - 50;
  const end = level * 500 - 50;
  return { start, end };
}

interface SmallStatProps {
  label: string;
  value: number;
  sub: string;
  valueColor?: string;
}

function SmallStat({ label, value, sub, valueColor = Colors.primary }: SmallStatProps) {
  return (
    <View className="flex-1 bg-surface rounded-2xl p-3">
      <Text
        className="text-muted mb-1 font-display text-[9px] tracking-[1.5px]"
      >
        {label}
      </Text>
      <Text className="font-display text-[28px] leading-[30px]" style={{ color: valueColor }}>
        {value}
      </Text>
      <Text
        className="text-hint mt-0.5 font-body text-[10px]"
      >
        {sub}
      </Text>
    </View>
  );
}

interface ProgressStatsProps {
  stats: Stats;
}

export function ProgressStats({ stats }: ProgressStatsProps) {
  const { t } = useTranslation('progress');
  const { level, xp, totalPRs, checkinStreak, workoutsCompleted } = stats;
  const { start, end } = xpBounds(level);
  const pct = Math.min(1, Math.max(0, (xp - start) / (end - start)));
  const xpInLevel = Math.max(0, xp - start);
  const xpNeeded = end - start;
  const streakColor = checkinStreak >= 3 ? Colors.warning : Colors.primary;

  return (
    <View className="gap-3">
      {/* Level card — full width for XP bar */}
      <View className="bg-surface rounded-2xl p-4">
        <View className="flex-row items-end justify-between mb-2">
          <View>
            <Text
              className="text-muted mb-1 font-display text-[10px] tracking-[2px]"
            >
              {t('level')}
            </Text>
            <Text className="font-display text-[40px] text-accent leading-[42px]">
              {level}
            </Text>
          </View>
          <Text
            className="text-secondary mb-1 font-body text-[12px]"
          >
            {t('xpProgress', { xpInLevel, xpNeeded })}
          </Text>
        </View>
        <View
          className="rounded-full overflow-hidden h-1.25 bg-elevated"
        >
          <View
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </View>
      </View>

      {/* Three stat cards in one row */}
      <View className="flex-row gap-3">
        <SmallStat label={t('totalPrs')} value={totalPRs} sub={t('records')} />
        <SmallStat label={t('dayStreak')} value={checkinStreak} sub={t('days')} valueColor={streakColor} />
        <SmallStat label={t('workouts')} value={workoutsCompleted} sub={t('done')} />
      </View>
    </View>
  );
}
