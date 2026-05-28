import { create } from 'zustand';
import type { TrainingSessionWithExercises, CreateSessionInput } from '@/types/train';
import {
  fetchSessions,
  createSession,
  deleteSession,
  startWorkout as startWorkoutAPI,
  completeWorkout as completeWorkoutAPI,
} from '@/lib/train';

interface TrainState {
  sessions: TrainingSessionWithExercises[];
  loading: boolean;
  error: string | null;

  /** ID of the in-progress workout_log row; null when no workout is active. */
  activeWorkoutLogId: string | null;
  /** Date.now() snapshot from when the workout was started — used for duration. */
  workoutStartTime: number | null;

  // ─── Actions ────────────────────────────────────────────────────────────────

  /** Load (or reload) all sessions for the given user. */
  loadSessions: (userId: string) => Promise<void>;

  /** Create a new session and optimistically append it to the list. */
  addSession: (userId: string, input: CreateSessionInput) => Promise<string | null>;

  /** Delete a session (cascades to its exercises on the DB). */
  removeSession: (sessionId: string) => Promise<void>;

  /**
   * Start an active workout for a session — creates a workout_log row.
   * Returns the workout log ID, or null on error.
   */
  beginWorkout: (userId: string, session: TrainingSessionWithExercises) => Promise<string | null>;

  /**
   * Mark the active workout as complete and award XP.
   * Pass the number of sets actually completed and the workout duration.
   */
  finishWorkout: (setsCompleted: number) => Promise<void>;

  /** Discard the active workout without recording a log entry. */
  cancelWorkout: () => void;

  reset: () => void;
}

export const useTrainStore = create<TrainState>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,
  activeWorkoutLogId: null,
  workoutStartTime: null,

  // ─── Sessions ──────────────────────────────────────────────────────────────

  loadSessions: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await fetchSessions(userId);
    set({ sessions: data, loading: false, error });
  },

  addSession: async (userId, input) => {
    const { data, error } = await createSession(userId, input);
    if (error || !data) {
      set({ error });
      return null;
    }
    set((state) => ({ sessions: [...state.sessions, data] }));
    return data.id;
  },

  removeSession: async (sessionId) => {
    const { error } = await deleteSession(sessionId);
    if (!error) {
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      }));
    }
  },

  // ─── Workout logs ───────────────────────────────────────────────────────────

  beginWorkout: async (userId, session) => {
    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const { data, error } = await startWorkoutAPI(userId, session.id, session.name, totalSets);
    if (error || !data) return null;
    set({ activeWorkoutLogId: data.id, workoutStartTime: Date.now() });
    return data.id;
  },

  finishWorkout: async (setsCompleted) => {
    const { activeWorkoutLogId, workoutStartTime } = get();
    if (!activeWorkoutLogId) return;

    const durationSeconds = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime) / 1000)
      : 0;

    await completeWorkoutAPI(activeWorkoutLogId, setsCompleted, durationSeconds);
    set({ activeWorkoutLogId: null, workoutStartTime: null });
  },

  cancelWorkout: () => {
    set({ activeWorkoutLogId: null, workoutStartTime: null });
  },

  // ─── Reset ─────────────────────────────────────────────────────────────────

  reset: () =>
    set({
      sessions: [],
      loading: false,
      error: null,
      activeWorkoutLogId: null,
      workoutStartTime: null,
    }),
}));
