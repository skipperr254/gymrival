/** 0 = Monday … 6 = Sunday (ISO-aligned) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
  5: 'Sat',
  6: 'Sun',
};

/** Reverse lookup: day name → DayOfWeek */
export const DAY_NAME_TO_INDEX: Record<string, DayOfWeek> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

// ─── DB row types (mirror the schema exactly) ─────────────────────────────────

export interface TrainingProgram {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  program_id: string | null;
  user_id: string;
  name: string;
  /** 0=Mon … 6=Sun; null = floating/unscheduled */
  day_of_week: DayOfWeek | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  user_id: string;
  /** Populated when the exercise matches a known exercise_types key */
  exercise_key: string | null;
  exercise_name: string;
  sets: number;
  /** TEXT to support ranges ("8-10"), AMRAP, etc. */
  reps: string;
  /** null = unspecified; 0 = bodyweight */
  target_weight: number | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionWithExercises extends TrainingSession {
  exercises: SessionExercise[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  session_id: string | null;
  gym_checkin_id: string | null;
  /** Snapshot of the session name captured at log creation time */
  session_name: string;
  duration_seconds: number | null;
  sets_completed: number;
  total_sets: number;
  notes: string | null;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface WorkoutLogSet {
  id: string;
  workout_log_id: string;
  session_exercise_id: string | null;
  user_id: string;
  exercise_key: string | null;
  exercise_name: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Input types (used by service + store) ────────────────────────────────────

export interface CreateSessionExerciseInput {
  exercise_name: string;
  /** Populated when the name matches a known exercise_types entry */
  exercise_key: string | null;
  sets: number;
  reps: string;
  /** null = unspecified; 0 = bodyweight */
  target_weight: number | null;
}

export interface CreateSessionInput {
  name: string;
  day_of_week: DayOfWeek | null;
  exercises: CreateSessionExerciseInput[];
}
