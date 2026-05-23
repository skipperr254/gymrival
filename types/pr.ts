export type ExerciseUnit = 'kg' | 'reps' | 'sec';

export interface ExerciseType {
  key: string;
  label: string;
  icon: string;
  unit: ExerciseUnit;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_key: string;
  value: number;
  unit: ExerciseUnit;
  created_at: string;
}

export interface PersonalRecordWithExercise extends PersonalRecord {
  exercise: ExerciseType;
}

export interface PRHistoryEntry {
  id: string;
  value: number;
  unit: ExerciseUnit;
  created_at: string;
}

export interface PRHistoryGroup {
  exercise: ExerciseType;
  best: number;
  entries: PRHistoryEntry[];
}
