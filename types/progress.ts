import type { ExerciseUnit } from './pr';

export interface ProgressPoint {
  date: string;
  value: number;
}

export interface StrengthSeries {
  exerciseKey: string;
  label: string;
  unit: ExerciseUnit;
  /** Running-best points: each point represents a new personal best achieved up to that date. */
  points: ProgressPoint[];
}

export interface CheckinDay {
  /** ISO date string YYYY-MM-DD */
  date: string;
  count: number;
}

export interface ProgressStats {
  level: number;
  xp: number;
  totalPRs: number;
  checkinStreak: number;
  workoutsCompleted: number;
}

export interface ProgressData {
  stats: ProgressStats;
  /** Per-exercise running-best series (only exercises with at least one PR). */
  series: StrengthSeries[];
  /** Combined bench + squat + deadlift running total. Null when user has none. */
  bigThreeTotal: StrengthSeries | null;
  /** Per-day gym check-in counts for the last 12 weeks. */
  checkins: CheckinDay[];
}
