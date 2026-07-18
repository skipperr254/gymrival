import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { formatMonthYear } from '@/lib/i18n/format';
import type { PersonalRecordWithExercise } from '@/types/pr';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EXERCISE_ICONS: Record<string, IoniconName> = {
  bench_press: 'barbell-outline',
  squat: 'body-outline',
  deadlift: 'fitness-outline',
  pull_ups: 'trending-up-outline',
  overhead_press: 'arrow-up-circle-outline',
  barbell_row: 'swap-vertical-outline',
  dumbbell_curl: 'barbell-outline',
  lat_pulldown: 'arrow-down-circle-outline',
  leg_press: 'walk-outline',
  shoulder_press: 'arrow-up-outline',
  romanian_deadlift: 'accessibility-outline',
  tricep_dips: 'hand-right-outline',
  cable_fly: 'radio-outline',
  plank: 'timer-outline',
  running_1k: 'walk-outline',
  running_5k: 'bicycle-outline',
  cycling_1k: 'bicycle-outline',
};

export function getExerciseIcon(key: string): IoniconName {
  return EXERCISE_ICONS[key] ?? 'fitness-outline';
}

export function formatMemberSince(dateStr: string): string {
  return formatMonthYear(dateStr);
}

export function computeBarRatios(prs: PersonalRecordWithExercise[]): number[] {
  const maxByUnit: Record<string, number> = {};
  for (const pr of prs) {
    maxByUnit[pr.unit] = Math.max(maxByUnit[pr.unit] ?? 0, pr.value);
  }
  return prs.map((pr) => Math.min(pr.value / (maxByUnit[pr.unit] ?? 1), 1));
}
