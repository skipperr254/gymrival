export type ExerciseUnit = 'kg' | 'reps' | 'sec';

export type PRVideoStatus = 'uploading' | 'ready' | 'failed';

export interface PRVideo {
  id: string;
  pr_id: string;
  user_id: string;
  /** Raw Storage path (bucket-relative) — needed to delete the object on retry */
  video_path: string;
  /** Raw Storage path (bucket-relative), null if no thumbnail was generated */
  thumbnail_path: string | null;
  /** Full public URL — computed in the API layer from storage path */
  video_url: string;
  /** Full public URL or null if thumbnail generation failed */
  thumbnail_url: string | null;
  duration_sec: number | null;
  /** Source video dimensions, captured at upload time — null on legacy rows */
  video_width: number | null;
  video_height: number | null;
  status: PRVideoStatus;
  created_at: string;
}

export interface ExerciseType {
  key: string;
  label: string;
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
