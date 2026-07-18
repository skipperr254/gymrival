import { supabase } from '@/lib/supabase';
import type {
  TrainingSession,
  TrainingSessionWithExercises,
  SessionExercise,
  WorkoutLog,
  CreateSessionInput,
} from '@/types/train';

// ─── Sessions ─────────────────────────────────────────────────────────────────

/**
 * Fetch all training sessions for a user, each hydrated with their exercises.
 * Returns sessions ordered by sort_order, exercises ordered within each session.
 */
export async function fetchSessions(
  userId: string
): Promise<{ data: TrainingSessionWithExercises[]; error: string | null }> {
  const { data: sessions, error: sErr } = await supabase
    .from('training_sessions')
    .select('id, program_id, user_id, name, day_of_week, sort_order, created_at, updated_at')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (sErr) return { data: [], error: sErr.message };
  if (!sessions?.length) return { data: [], error: null };

  const sessionIds = sessions.map((s) => s.id);

  const { data: exercises, error: eErr } = await supabase
    .from('session_exercises')
    .select(
      'id, session_id, user_id, exercise_key, exercise_name, sets, reps, target_weight, sort_order, notes, created_at, updated_at'
    )
    .in('session_id', sessionIds)
    .order('sort_order', { ascending: true });

  if (eErr) return { data: [], error: eErr.message };

  const exerciseMap = new Map<string, SessionExercise[]>();
  for (const ex of exercises ?? []) {
    if (!exerciseMap.has(ex.session_id)) exerciseMap.set(ex.session_id, []);
    exerciseMap.get(ex.session_id)!.push({
      ...ex,
      sets: Number(ex.sets),
      target_weight: ex.target_weight != null ? Number(ex.target_weight) : null,
    } as SessionExercise);
  }

  return {
    data: sessions.map((s) => ({
      ...s,
      exercises: exerciseMap.get(s.id) ?? [],
    })) as TrainingSessionWithExercises[],
    error: null,
  };
}

/**
 * Create a new session with its exercises in a single round-trip.
 * Exercises are inserted in one batch after the session row is created.
 */
export async function createSession(
  userId: string,
  input: CreateSessionInput
): Promise<{ data: TrainingSessionWithExercises | null; error: string | null }> {
  const { data: session, error: sErr } = await supabase
    .from('training_sessions')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      day_of_week: input.day_of_week,
      sort_order: 0,
    })
    .select('id, program_id, user_id, name, day_of_week, sort_order, created_at, updated_at')
    .single();

  if (sErr || !session) {
    return { data: null, error: sErr?.message ?? 'Failed to create session' };
  }

  if (input.exercises.length === 0) {
    return {
      data: { ...(session as TrainingSession), exercises: [] },
      error: null,
    };
  }

  const exerciseRows = input.exercises.map((ex, i) => ({
    session_id: session.id,
    user_id: userId,
    exercise_key: ex.exercise_key,
    exercise_name: ex.exercise_name.trim(),
    sets: ex.sets,
    reps: ex.reps,
    target_weight: ex.target_weight,
    sort_order: i,
  }));

  const { data: exercises, error: eErr } = await supabase
    .from('session_exercises')
    .insert(exerciseRows)
    .select(
      'id, session_id, user_id, exercise_key, exercise_name, sets, reps, target_weight, sort_order, notes, created_at, updated_at'
    )
    .order('sort_order', { ascending: true });

  if (eErr) {
    // Roll back the session row so we don't leave orphans
    await supabase.from('training_sessions').delete().eq('id', session.id);
    return { data: null, error: eErr.message };
  }

  return {
    data: {
      ...(session as TrainingSession),
      exercises: (exercises ?? []).map((ex) => ({
        ...ex,
        sets: Number(ex.sets),
        target_weight: ex.target_weight != null ? Number(ex.target_weight) : null,
      })) as SessionExercise[],
    },
    error: null,
  };
}

/** Delete a session (cascades to session_exercises). */
export async function deleteSession(
  sessionId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', sessionId);
  return { error: error?.message ?? null };
}

// ─── Workout logs ─────────────────────────────────────────────────────────────

/**
 * Create a new workout log when the user taps "Start Workout".
 * Returns the new log row so the store can track its ID for later completion.
 */
export async function startWorkout(
  userId: string,
  sessionId: string,
  sessionName: string,
  totalSets: number
): Promise<{ data: WorkoutLog | null; error: string | null }> {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      user_id: userId,
      session_id: sessionId,
      session_name: sessionName,
      total_sets: totalSets,
      sets_completed: 0,
      is_complete: false,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as WorkoutLog, error: null };
}

/**
 * Mark a workout log as complete.
 * The XP trigger fires on this UPDATE when is_complete transitions to true.
 */
export async function completeWorkout(
  workoutLogId: string,
  setsCompleted: number,
  durationSeconds: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('workout_logs')
    .update({
      is_complete: true,
      sets_completed: setsCompleted,
      duration_seconds: durationSeconds,
      completed_at: new Date().toISOString(),
    })
    .eq('id', workoutLogId);

  return { error: error?.message ?? null };
}

/**
 * Fetch completed workout logs for a user, newest-first.
 * Used by the AI Coach and future analytics screens.
 */
export async function fetchWorkoutLogs(
  userId: string,
  limit = 30
): Promise<{ data: WorkoutLog[]; error: string | null }> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_complete', true)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as WorkoutLog[], error: null };
}
