import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  deleteWorkoutLog,
} from '@/lib/train';
import {
  fetchGymsWithTodayCount,
  fetchActiveCheckin,
  fetchWeeklyStreak,
  fetchFriendsCheckedIn,
  checkinToGym as checkinToGymAPI,
  undoCheckin as undoCheckinAPI,
} from '@/lib/checkin';

const ACTIVE_WORKOUT_KEY = 'gymrival:activeWorkout';

interface PersistedActiveWorkout {
  workoutLogId: string;
  sessionId: string;
  startTime: number;
}

// Best-effort — an app kill mid-workout (common on Android under memory
// pressure) previously lost all in-progress state with no way to detect or
// resume it on relaunch, and left the workout_logs row it created permanently
// is_complete=false with no cleanup path. Persisting just enough to resume
// (which session, which log row, when it started) lets the screen re-open
// the same workout instead of losing it or accumulating orphaned rows on
// every interrupted session. Per-set checkbox state is not persisted (a
// smaller residual cost) — the user resumes with all sets unchecked.
async function persistActiveWorkout(v: PersistedActiveWorkout | null): Promise<void> {
  try {
    if (v) await AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(v));
    else await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
  } catch {
    // Losing persistence just means no resume prompt next launch, not a crash.
  }
}

interface TrainState {
  // ─── Training sessions ──────────────────────────────────────────────────────
  sessions: TrainingSessionWithExercises[];
  loading: boolean;
  error: string | null;

  /** ID of the in-progress workout_log row; null when no workout is active. */
  activeWorkoutLogId: string | null;
  /** Date.now() snapshot from when the workout was started — used for duration. */
  workoutStartTime: number | null;
  /** Id of the session the active workout belongs to — lets the screen
   * re-select the right session after restoreActiveWorkout() rehydrates a
   * workout that was in progress when the app was last killed. */
  activeSessionId: string | null;

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

  /** Delete a session (cascades to its exercises on the DB). Returns the
   * error (if any) so the caller can surface a failure instead of the
   * delete silently no-oping. */
  removeSession: (sessionId: string) => Promise<{ error: string | null }>;

  /**
   * Start an active workout for a session — creates a workout_log row.
   * Returns the workout log ID, or null on error.
   */
  beginWorkout: (userId: string, session: TrainingSessionWithExercises) => Promise<string | null>;

  /**
   * Mark the active workout as complete and award XP.
   * Pass the number of sets actually completed and the workout duration.
   * Returns the error (if any) so the caller can avoid navigating away /
   * showing a success state when the completion write actually failed.
   */
  finishWorkout: (setsCompleted: number) => Promise<{ error: string | null }>;

  /** Discard the active workout without recording a log entry. Also deletes
   * the workout_log row created by beginWorkout — otherwise every abandoned
   * workout (back button, not just the explicit Cancel button) left a
   * permanent is_complete=false row with no cleanup path. */
  cancelWorkout: () => void;

  /** Rehydrates activeWorkoutLogId/workoutStartTime/activeSessionId from a
   * previous session's persisted in-progress workout, if any. Call once on
   * mount — the screen then matches activeSessionId against its loaded
   * `sessions` list to resume the UI. */
  restoreActiveWorkout: () => Promise<void>;

  // ─── Check-in actions ───────────────────────────────────────────────────────

  /**
   * Load all check-in screen data in parallel: gym list (with today counts),
   * the user's active check-in, this week's streak, and friends' check-ins.
   * Pass `friendIds` from useSocialStore.friends.
   */
  loadCheckinData: (userId: string, friendIds: string[]) => Promise<void>;

  /**
   * Check in to a gym. Updates activeCheckin and weeklyStreak on success.
   * Returns `{ xpAwarded, error }` so the caller can show the XP banner or
   * surface a failure instead of the request silently no-oping.
   */
  performCheckin: (userId: string, gymId: string) => Promise<{ xpAwarded: boolean; error: string | null }>;

  /**
   * Undo the active check-in. Clears activeCheckin and updates weeklyStreak
   * (the checked day may no longer be marked if no other check-in exists for it).
   * Returns the error (if any).
   */
  performUndoCheckin: (userId: string) => Promise<{ error: string | null }>;

  reset: () => void;
}

export const useTrainStore = create<TrainState>((set, get) => ({
  // ─── Sessions initial state ─────────────────────────────────────────────────
  sessions: [],
  loading: false,
  error: null,
  activeWorkoutLogId: null,
  workoutStartTime: null,
  activeSessionId: null,

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
    return { error };
  },

  // ─── Workout logs ───────────────────────────────────────────────────────────

  beginWorkout: async (userId, session) => {
    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const { data, error } = await startWorkoutAPI(userId, session.id, session.name, totalSets);
    if (error || !data) return null;
    const startTime = Date.now();
    set({ activeWorkoutLogId: data.id, workoutStartTime: startTime, activeSessionId: session.id });
    persistActiveWorkout({ workoutLogId: data.id, sessionId: session.id, startTime });
    return data.id;
  },

  finishWorkout: async (setsCompleted) => {
    const { activeWorkoutLogId, workoutStartTime } = get();
    if (!activeWorkoutLogId) return { error: null };

    const durationSeconds = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime) / 1000)
      : 0;

    const { error } = await completeWorkoutAPI(activeWorkoutLogId, setsCompleted, durationSeconds);
    if (error) return { error };

    set({ activeWorkoutLogId: null, workoutStartTime: null, activeSessionId: null });
    persistActiveWorkout(null);
    return { error: null };
  },

  cancelWorkout: () => {
    const { activeWorkoutLogId } = get();
    set({ activeWorkoutLogId: null, workoutStartTime: null, activeSessionId: null });
    persistActiveWorkout(null);
    // Best-effort — the UI has already moved on regardless of whether this
    // succeeds; a failed delete here just leaves one orphaned row instead of
    // reintroducing the original "every cancel leaks a row" bug.
    if (activeWorkoutLogId) deleteWorkoutLog(activeWorkoutLogId).catch(() => {});
  },

  restoreActiveWorkout: async () => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedActiveWorkout;
      set({
        activeWorkoutLogId: parsed.workoutLogId,
        workoutStartTime: parsed.startTime,
        activeSessionId: parsed.sessionId,
      });
    } catch {
      // Corrupt/unreadable entry — treat as no in-progress workout.
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
    }
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
      return { xpAwarded: false, error: error ?? 'Check-in failed' };
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

    return { xpAwarded, error: null };
  },

  performUndoCheckin: async (userId) => {
    const { activeCheckin } = get();
    if (!activeCheckin) return { error: null };

    set({ checkinLoading: true });

    const { error } = await undoCheckinAPI(activeCheckin.id);

    if (error) {
      set({ checkinLoading: false });
      return { error };
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
    return { error: null };
  },

  // ─── Reset ─────────────────────────────────────────────────────────────────

  reset: () => {
    // The persisted blob isn't namespaced per user — without clearing it
    // here, a different account signing in on the same device could be
    // prompted to "resume" the previous account's workout.
    persistActiveWorkout(null);
    set({
      sessions: [],
      loading: false,
      error: null,
      activeWorkoutLogId: null,
      workoutStartTime: null,
      activeSessionId: null,
      gyms: [],
      activeCheckin: null,
      weeklyStreak: [],
      friendsCheckedIn: [],
      checkinLoading: false,
      lastCheckinXpAwarded: false,
    });
  },
}));
