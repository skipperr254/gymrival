import { formatMonthYear } from '@/lib/i18n/format';
import type { PersonalRecordWithExercise } from '@/types/pr';

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
