export type ExerciseUnit = 'kg' | 'reps' | 'sec';

export type PRVideoStatus = 'uploading' | 'ready' | 'failed';

export interface PRVideo {
  id: string;
  pr_id: string;
  user_id: string;
  /** Full public URL — computed in the API layer from storage path */
  video_url: string;
  /** Full public URL or null if thumbnail generation failed */
  thumbnail_url: string | null;
  duration_sec: number | null;
  status: PRVideoStatus;
  created_at: string;
}

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
