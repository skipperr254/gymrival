import { create } from "zustand";
import type { ExerciseType } from "@/types/pr";
import type { RivalEntry, GlobalLeaderboardEntry } from "@/types/compete";
import type {
  ChallengeWithStats,
  ChallengeLeaderboardEntry,
  ChallengeInvitation,
  CreateFriendChallengeInput,
} from "@/types/challenge";
import {
  fetchExerciseTypes,
  fetchRivalsLeaderboard,
  fetchGlobalLeaderboard,
  fetchMyGlobalRank,
  fetchActiveChallenges,
  fetchChallengeLeaderboard,
  joinChallenge as apiJoinChallenge,
  leaveChallenge as apiLeaveChallenge,
  createFriendChallenge as apiCreateFriendChallenge,
  fetchPendingInvitations,
  respondToInvitation as apiRespondToInvitation,
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
  myGlobalRank: GlobalLeaderboardEntry | null;
  loadingGlobal: boolean;
  loadingMyRank: boolean;
  globalHasMore: boolean;
  globalOffset: number;
  globalError: string | null;

  // ─── Challenges ─────────────────────────────────────────────────────────────
  challenges: ChallengeWithStats[];
  loadingChallenges: boolean;
  challengesError: string | null;

  /** Leaderboard entries keyed by challenge id */
  leaderboards: Record<string, ChallengeLeaderboardEntry[]>;
  loadingLeaderboard: Record<string, boolean>;

  /** Pending challenge invitations for the current user */
  pendingInvitations: ChallengeInvitation[];
  loadingInvitations: boolean;

  // ─── Shared ─────────────────────────────────────────────────────────────────
  error: string | null;

  // ─── Actions ────────────────────────────────────────────────────────────────
  loadExercises: () => Promise<void>;
  loadRivals: (userId: string) => Promise<void>;
  setSelectedExercise: (key: string, userId: string) => Promise<void>;

  loadGlobalLeaderboard: (userId: string, search?: string) => Promise<void>;
  loadMoreGlobal: (userId: string, search?: string) => Promise<void>;
  loadMyGlobalRank: (userId: string) => Promise<void>;

  // Challenges
  loadChallenges: (userId: string) => Promise<void>;
  loadLeaderboard: (challengeId: string, userId: string) => Promise<void>;
  joinChallenge: (challengeId: string, userId: string) => Promise<{ error: string | null }>;
  leaveChallenge: (challengeId: string, userId: string) => Promise<{ error: string | null }>;
  createFriendChallenge: (
    creatorId: string,
    input: CreateFriendChallengeInput,
  ) => Promise<{ challengeId: string | null; error: string | null }>;
  loadPendingInvitations: (userId: string) => Promise<void>;
  respondToInvitation: (
    invitationId: string,
    challengeId: string,
    userId: string,
    response: 'accepted' | 'declined',
  ) => Promise<{ error: string | null }>;

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

  challenges: [],
  loadingChallenges: false,
  challengesError: null,

  leaderboards: {},
  loadingLeaderboard: {},

  pendingInvitations: [],
  loadingInvitations: false,

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

  // ─── Challenges ─────────────────────────────────────────────────────────────

  loadChallenges: async (userId) => {
    set({ loadingChallenges: true, challengesError: null });
    const { data, error } = await fetchActiveChallenges(userId);
    set({ challenges: data, loadingChallenges: false, challengesError: error });
  },

  loadLeaderboard: async (challengeId, userId) => {
    set((state) => ({
      loadingLeaderboard: { ...state.loadingLeaderboard, [challengeId]: true },
    }));
    const { data, error } = await fetchChallengeLeaderboard(challengeId, userId);
    set((state) => ({
      leaderboards: error
        ? state.leaderboards
        : { ...state.leaderboards, [challengeId]: data },
      loadingLeaderboard: { ...state.loadingLeaderboard, [challengeId]: false },
    }));
  },

  joinChallenge: async (challengeId, userId) => {
    const result = await apiJoinChallenge(challengeId, userId);
    if (!result.error) {
      // Optimistically mark as joined and increment count
      set((state) => ({
        challenges: state.challenges.map((c) =>
          c.id === challengeId
            ? { ...c, is_joined: true, participant_count: c.participant_count + 1 }
            : c,
        ),
      }));
      // Reload leaderboard to reflect new participant
      await get().loadLeaderboard(challengeId, userId);
    }
    return result;
  },

  leaveChallenge: async (challengeId, userId) => {
    const result = await apiLeaveChallenge(challengeId, userId);
    if (!result.error) {
      set((state) => ({
        challenges: state.challenges.map((c) =>
          c.id === challengeId
            ? {
                ...c,
                is_joined: false,
                participant_count: Math.max(0, c.participant_count - 1),
                user_score: null,
                user_rank: null,
              }
            : c,
        ),
        leaderboards: {
          ...state.leaderboards,
          [challengeId]: (state.leaderboards[challengeId] ?? []).filter(
            (e) => e.user_id !== userId,
          ),
        },
      }));
    }
    return result;
  },

  createFriendChallenge: async (creatorId, input) => {
    const result = await apiCreateFriendChallenge(creatorId, input);
    if (!result.error) {
      // Reload challenges so new one appears in the list
      await get().loadChallenges(creatorId);
    }
    return result;
  },

  loadPendingInvitations: async (userId) => {
    set({ loadingInvitations: true });
    const { data } = await fetchPendingInvitations(userId);
    set({ pendingInvitations: data, loadingInvitations: false });
  },

  respondToInvitation: async (invitationId, challengeId, userId, response) => {
    const result = await apiRespondToInvitation(invitationId, challengeId, userId, response);
    if (!result.error) {
      // Remove from pending list
      set((state) => ({
        pendingInvitations: state.pendingInvitations.filter((i) => i.id !== invitationId),
      }));
      if (response === 'accepted') {
        // Reload challenges to pick up the newly joined one
        await get().loadChallenges(userId);
      }
    }
    return result;
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
      challenges: [],
      loadingChallenges: false,
      challengesError: null,
      leaderboards: {},
      loadingLeaderboard: {},
      pendingInvitations: [],
      loadingInvitations: false,
    }),
}));
