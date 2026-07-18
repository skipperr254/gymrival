import type { ExerciseUnit } from './pr';

export interface RivalEntry {
  userId: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  bestPR: number;
  unit: ExerciseUnit;
  rank: number;
  isMe: boolean;
}

/**
 * One row returned by the global_leaderboard() Postgres function.
 * Ranked by combined bench + squat + deadlift best PRs ("the big 3").
 */
export interface GlobalLeaderboardEntry {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  country_code: string | null;
  bench_pr: number;
  squat_pr: number;
  deadlift_pr: number;
  total_kg: number;
  rank: number;
  is_me: boolean;
}
