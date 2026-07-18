import { create } from 'zustand';
import type {
  TrainingSessionWithExercises,
  CreateSessionInput,
  GymWithCheckinCount,
  GymCheckin,
  FriendCheckin,
  WeeklyStreakDay,
} from '@/types/train';
import {
  fetchSessions,
  createSession,
  deleteSession,
  startWorkout as startWorkoutAPI,
  completeWorkout as completeWorkoutAPI,
} from '@/lib/train';
import {
  fetchGymsWithTodayCount,
  fetchActiveCheckin,
  fetchWeeklyStreak,
  fetchFriendsCheckedIn,
  checkinToGym as checkinToGymAPI,
  undoCheckin as undoCheckinAPI,
} from '@/lib/checkin';

interface TrainState {
  // ─── Training sessions ──────────────────────────────────────────────────────
  sessions: TrainingSessionWithExercises[];
  loading: boolean;
  error: string | null;

  /** ID of the in-progress workout_log row; null when no workout is active. */
  activeWorkoutLogId: string | null;
  /** Date.now() snapshot from when the workout was started — used for duration. */
  workoutStartTime: number | null;

  // ─── Gym check-ins ──────────────────────────────────────────────────────────
  gyms: GymWithCheckinCount[];
  /** The current user's active check-in (null = not checked in). */
  activeCheckin: GymCheckin | null;
  weeklyStreak: WeeklyStreakDay[];
  friendsCheckedIn: FriendCheckin[];
  checkinLoading: boolean;
  /** True when XP was awarded for the most recent check-in (shown in UI). */
  lastCheckinXpAwarded: boolean;

  // ─── Session actions ────────────────────────────────────────────────────────

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

  // ─── Check-in actions ───────────────────────────────────────────────────────

  /**
   * Load all check-in screen data in parallel: gym list (with today counts),
   * the user's active check-in, this week's streak, and friends' check-ins.
   * Pass `friendIds` from useSocialStore.friends.
   */
  loadCheckinData: (userId: string, friendIds: string[]) => Promise<void>;

  /**
   * Check in to a gym. Updates activeCheckin and weeklyStreak on success.
   * Returns `{ xpAwarded }` so the caller can show the XP banner.
   */
  performCheckin: (userId: string, gymId: string) => Promise<{ xpAwarded: boolean }>;

  /**
   * Undo the active check-in. Clears activeCheckin and updates weeklyStreak
   * (the checked day may no longer be marked if no other check-in exists for it).
   */
  performUndoCheckin: (userId: string) => Promise<void>;

  reset: () => void;
}

export const useTrainStore = create<TrainState>((set, get) => ({
  // ─── Sessions initial state ─────────────────────────────────────────────────
  sessions: [],
  loading: false,
  error: null,
  activeWorkoutLogId: null,
  workoutStartTime: null,

  // ─── Check-in initial state ─────────────────────────────────────────────────
  gyms: [],
  activeCheckin: null,
  weeklyStreak: [],
  friendsCheckedIn: [],
  checkinLoading: false,
  lastCheckinXpAwarded: false,

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

  // ─── Check-in actions ───────────────────────────────────────────────────────

  loadCheckinData: async (userId, friendIds) => {
    set({ checkinLoading: true });

    const [gymsResult, activeResult, streakResult, friendsResult] =
      await Promise.all([
        fetchGymsWithTodayCount(),
        fetchActiveCheckin(userId),
        fetchWeeklyStreak(userId),
        fetchFriendsCheckedIn(friendIds),
      ]);

    set({
      gyms: gymsResult.data,
      activeCheckin: activeResult.data,
      weeklyStreak: streakResult.data,
      friendsCheckedIn: friendsResult.data,
      checkinLoading: false,
    });
  },

  performCheckin: async (userId, gymId) => {
    set({ checkinLoading: true });

    const { data, xpAwarded, error } = await checkinToGymAPI(userId, gymId);

    if (error || !data) {
      set({ checkinLoading: false });
      return { xpAwarded: false };
    }

    // Refresh streak (the checked-in day is now marked) and gym counts
    const [streakResult, gymsResult] = await Promise.all([
      fetchWeeklyStreak(userId),
      fetchGymsWithTodayCount(),
    ]);

    set({
      activeCheckin: data,
      lastCheckinXpAwarded: xpAwarded,
      weeklyStreak: streakResult.data,
      gyms: gymsResult.data,
      checkinLoading: false,
    });

    return { xpAwarded };
  },

  performUndoCheckin: async (userId) => {
    const { activeCheckin } = get();
    if (!activeCheckin) return;

    set({ checkinLoading: true });

    const { error } = await undoCheckinAPI(activeCheckin.id);

    if (error) {
      set({ checkinLoading: false });
      return;
    }

    // Refresh streak (the day might no longer be checked) and gym counts
    const [streakResult, gymsResult] = await Promise.all([
      fetchWeeklyStreak(userId),
      fetchGymsWithTodayCount(),
    ]);

    set({
      activeCheckin: null,
      lastCheckinXpAwarded: false,
      weeklyStreak: streakResult.data,
      gyms: gymsResult.data,
      checkinLoading: false,
    });
  },

  // ─── Reset ─────────────────────────────────────────────────────────────────

  reset: () =>
    set({
      sessions: [],
      loading: false,
      error: null,
      activeWorkoutLogId: null,
      workoutStartTime: null,
      gyms: [],
      activeCheckin: null,
      weeklyStreak: [],
      friendsCheckedIn: [],
      checkinLoading: false,
      lastCheckinXpAwarded: false,
    }),
}));
