// Internal canonical day values — never rendered directly, only used as store
// keys/lookups. Display always goes through t('days.short.<index>') etc.
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type NewExercise = { name: string; sets: string; reps: string; weight: string };
export type NewWorkout = { name: string; day: string; exercises: Array<{ name: string; sets: number; reps: string; weight: number }> };
