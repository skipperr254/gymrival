import { create } from "zustand";
import type { ExerciseType } from "@/types/pr";
import type { RivalEntry, GlobalLeaderboardEntry } from "@/types/compete";
import {
  fetchExerciseTypes,
  fetchRivalsLeaderboard,
  fetchGlobalLeaderboard,
  fetchMyGlobalRank,
} from "@/lib/api";

const PAGE_SIZE = 50;

interface CompeteState {
  // ─── Exercises ──────────────────────────────────────────────────────────────
  exercises: ExerciseType[];
  selectedExercise: string;
  loadingExercises: boolean;

  // ─── Rivals (friends) leaderboard ───────────────────────────────────────────
  rivals: RivalEntry[];
  loadingRivals: boolean;

  // ─── Global leaderboard ─────────────────────────────────────────────────────
  globalEntries: GlobalLeaderboardEntry[];
  /** Current user's own rank + stats; null when they have no big-3 PRs logged */
  myGlobalRank: GlobalLeaderboardEntry | null;
  loadingGlobal: boolean;
  loadingMyRank: boolean;
  globalHasMore: boolean;
  globalOffset: number;
  globalError: string | null;

  // ─── Shared ─────────────────────────────────────────────────────────────────
  error: string | null;

  // ─── Actions ────────────────────────────────────────────────────────────────
  loadExercises: () => Promise<void>;
  loadRivals: (userId: string) => Promise<void>;
  setSelectedExercise: (key: string, userId: string) => Promise<void>;

  /**
   * Load (or reload) the global leaderboard from page 0.
   * Pass `search` to filter by username / full_name.
   */
  loadGlobalLeaderboard: (userId: string, search?: string) => Promise<void>;
  /** Append the next page of global results (no-op when already at the end). */
  loadMoreGlobal: (userId: string, search?: string) => Promise<void>;
  /** Fetch (or refresh) the current user's own global rank. */
  loadMyGlobalRank: (userId: string) => Promise<void>;

  reset: () => void;
}

export const useCompeteStore = create<CompeteState>((set, get) => ({
  exercises: [],
  selectedExercise: "bench",
  loadingExercises: false,

  rivals: [],
  loadingRivals: false,

  globalEntries: [],
  myGlobalRank: null,
  loadingGlobal: false,
  loadingMyRank: false,
  globalHasMore: true,
  globalOffset: 0,
  globalError: null,

  error: null,

  // ─── Exercises ──────────────────────────────────────────────────────────────

  loadExercises: async () => {
    if (get().exercises.length > 0) return;
    set({ loadingExercises: true });
    const { data, error } = await fetchExerciseTypes();
    set({ exercises: data, loadingExercises: false, error });
  },

  // ─── Rivals ─────────────────────────────────────────────────────────────────

  loadRivals: async (userId) => {
    set({ loadingRivals: true, error: null });
    const { data, error } = await fetchRivalsLeaderboard(userId, get().selectedExercise);
    set({ rivals: data, loadingRivals: false, error });
  },

  setSelectedExercise: async (key, userId) => {
    set({ selectedExercise: key });
    await get().loadRivals(userId);
  },

  // ─── Global Leaderboard ─────────────────────────────────────────────────────

  loadGlobalLeaderboard: async (userId, search = "") => {
    set({ loadingGlobal: true, globalError: null });
    const { data, error } = await fetchGlobalLeaderboard(userId, search, PAGE_SIZE, 0);
    set({
      globalEntries: data,
      loadingGlobal: false,
      globalError: error,
      globalOffset: data.length,
      globalHasMore: data.length === PAGE_SIZE,
    });
  },

  loadMoreGlobal: async (userId, search = "") => {
    const { loadingGlobal, globalHasMore, globalOffset } = get();
    if (loadingGlobal || !globalHasMore) return;

    set({ loadingGlobal: true });
    const { data, error } = await fetchGlobalLeaderboard(userId, search, PAGE_SIZE, globalOffset);
    set((state) => ({
      globalEntries: [...state.globalEntries, ...data],
      loadingGlobal: false,
      globalError: error,
      globalOffset: state.globalOffset + data.length,
      globalHasMore: data.length === PAGE_SIZE,
    }));
  },

  loadMyGlobalRank: async (userId) => {
    set({ loadingMyRank: true });
    const { data } = await fetchMyGlobalRank(userId);
    set({ myGlobalRank: data, loadingMyRank: false });
  },

  // ─── Reset ──────────────────────────────────────────────────────────────────

  reset: () =>
    set({
      exercises: [],
      selectedExercise: "bench",
      rivals: [],
      loadingExercises: false,
      loadingRivals: false,
      globalEntries: [],
      myGlobalRank: null,
      loadingGlobal: false,
      loadingMyRank: false,
      globalHasMore: true,
      globalOffset: 0,
      globalError: null,
      error: null,
    }),
}));
