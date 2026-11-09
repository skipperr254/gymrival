import type { StateCreator } from "zustand";
import type { ExerciseType } from "@/types/pr";
import type { RivalEntry, GlobalLeaderboardEntry } from "@/types/compete";
import {
  fetchExerciseTypes,
  fetchRivalsLeaderboard,
  fetchGlobalLeaderboard,
  fetchMyGlobalRank,
} from "@/lib/api";
import type { CompeteState } from "../useCompeteStore";

const PAGE_SIZE = 50;

// Monotonic request sequence numbers so an out-of-order (slower) response
// can't overwrite state with stale data after a newer request has already
// started — e.g. rapidly switching exercise chips in Rivals, or a "Load
// More" response landing after a new search query's first-page response.
let rivalsRequestSeq = 0;
let globalRequestSeq = 0;

export interface LeaderboardsSlice {
  // ─── Exercises ──────────────────────────────────────────────────────────────
  exercises: ExerciseType[];
  selectedExercise: string;
  loadingExercises: boolean;

  // ─── Rivals (friends) leaderboard ───────────────────────────────────────────
  rivals: RivalEntry[];
  loadingRivals: boolean;

  // ─── Global leaderboard ─────────────────────────────────────────────────────
  globalEntries: GlobalLeaderboardEntry[];
  myGlobalRank: GlobalLeaderboardEntry | null;
  loadingGlobal: boolean;
  loadingMyRank: boolean;
  globalHasMore: boolean;
  globalOffset: number;
  globalError: string | null;
  myRankError: string | null;

  // ─── Shared ─────────────────────────────────────────────────────────────────
  error: string | null;

  // ─── Actions ────────────────────────────────────────────────────────────────
  loadExercises: () => Promise<void>;
  loadRivals: (userId: string) => Promise<void>;
  setSelectedExercise: (key: string, userId: string) => Promise<void>;

  loadGlobalLeaderboard: (userId: string, search?: string) => Promise<void>;
  loadMoreGlobal: (userId: string, search?: string) => Promise<void>;
  loadMyGlobalRank: (userId: string) => Promise<void>;
}

/** Fresh initial values, shared by the slice and reset(). */
export const leaderboardsInitialState = () => ({
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
  myRankError: null,

  error: null,
} satisfies Partial<LeaderboardsSlice>);

export const createLeaderboardsSlice: StateCreator<CompeteState, [], [], LeaderboardsSlice> = (set, get) => ({
  ...leaderboardsInitialState(),

  // ─── Exercises ──────────────────────────────────────────────────────────────

  loadExercises: async () => {
    if (get().exercises.length > 0) return;
    set({ loadingExercises: true });
    const { data, error } = await fetchExerciseTypes();
    set({ exercises: data, loadingExercises: false, error });
  },

  // ─── Rivals ─────────────────────────────────────────────────────────────────

  loadRivals: async (userId) => {
    const seq = ++rivalsRequestSeq;
    set({ loadingRivals: true, error: null });
    const { data, error } = await fetchRivalsLeaderboard(userId, get().selectedExercise);
    // A newer request (e.g. the user tapped a different exercise chip while
    // this one was still in flight) already superseded this response.
    if (seq !== rivalsRequestSeq) return;
    set({ rivals: data, loadingRivals: false, error });
  },

  setSelectedExercise: async (key, userId) => {
    set({ selectedExercise: key });
    await get().loadRivals(userId);
  },

  // ─── Global Leaderboard ─────────────────────────────────────────────────────

  loadGlobalLeaderboard: async (userId, search = "") => {
    const seq = ++globalRequestSeq;
    set({ loadingGlobal: true, globalError: null });
    const { data, error } = await fetchGlobalLeaderboard(userId, search, PAGE_SIZE, 0);
    // A newer search/page request already superseded this one.
    if (seq !== globalRequestSeq) return;
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

    const seq = ++globalRequestSeq;
    set({ loadingGlobal: true });
    const { data, error } = await fetchGlobalLeaderboard(userId, search, PAGE_SIZE, globalOffset);
    // A new search started while this page was loading — appending these
    // results now would mix two different queries' rows together.
    if (seq !== globalRequestSeq) return;
    set((state) => ({
      globalEntries: [...state.globalEntries, ...data],
      loadingGlobal: false,
      globalError: error,
      globalOffset: state.globalOffset + data.length,
      globalHasMore: data.length === PAGE_SIZE,
    }));
  },

  loadMyGlobalRank: async (userId) => {
    set({ loadingMyRank: true, myRankError: null });
    const { data, error } = await fetchMyGlobalRank(userId);
    set({ myGlobalRank: data, loadingMyRank: false, myRankError: error });
  },
});
