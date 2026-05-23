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
