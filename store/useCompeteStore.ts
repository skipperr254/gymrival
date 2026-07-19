import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import i18n from "@/lib/i18n";
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

// Monotonic request sequence numbers so an out-of-order (slower) response
// can't overwrite state with stale data after a newer request has already
// started — e.g. rapidly switching exercise chips in Rivals, or a "Load
// More" response landing after a new search query's first-page response.
let rivalsRequestSeq = 0;
let globalRequestSeq = 0;

// Realtime channel refs, same owner-aware cleanup pattern as
// useSocialStore/useChatStore. Migration 018 explicitly enabled Realtime on
// challenge_participants/challenge_invitations for exactly this purpose, but
// nothing ever subscribed — a friend joining/leaving/scoring in a challenge
// you're viewing, or a new invite arriving, only appeared after a manual
// refresh or remount.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _challengeChannel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _invitationsChannel: any = null;

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
  myRankError: string | null;

  // ─── Challenges ─────────────────────────────────────────────────────────────
  challenges: ChallengeWithStats[];
  loadingChallenges: boolean;
  challengesError: string | null;

  /** Leaderboard entries keyed by challenge id */
  leaderboards: Record<string, ChallengeLeaderboardEntry[]>;
  loadingLeaderboard: Record<string, boolean>;
  /** Set (non-null) when the last fetch for a challenge id failed — lets the UI
   * distinguish "network error" from "genuinely zero participants". */
  leaderboardErrors: Record<string, string | null>;

  /** Pending challenge invitations for the current user */
  pendingInvitations: ChallengeInvitation[];
  loadingInvitations: boolean;
  invitationsError: string | null;

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

  /** Live-updates a single challenge's leaderboard when any participant's
   * score/membership changes. Call when a challenge detail screen mounts.
   * Returns an unsubscribe function for useEffect cleanup. */
  subscribeToChallengeEvents: (challengeId: string, userId: string) => () => void;

  /** Live-updates pendingInvitations when a new invite arrives. Call while
   * the Challenges tab is mounted. Returns an unsubscribe function. */
  subscribeToInvitationEvents: (userId: string) => () => void;

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
  myRankError: null,

  challenges: [],
  loadingChallenges: false,
  challengesError: null,

  leaderboards: {},
  loadingLeaderboard: {},
  leaderboardErrors: {},

  pendingInvitations: [],
  loadingInvitations: false,
  invitationsError: null,

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

  // ─── Challenges ─────────────────────────────────────────────────────────────

  loadChallenges: async (userId) => {
    set({ loadingChallenges: true, challengesError: null });
    const { data, error } = await fetchActiveChallenges(userId, i18n.language);
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
      leaderboardErrors: { ...state.leaderboardErrors, [challengeId]: error },
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
      // The filter above leaves gaps in the remaining entries' cached ranks
      // (e.g. 1, 3, 4) until a full reload — refetch now instead of waiting
      // for the next unrelated screen visit to fix the display.
      await get().loadLeaderboard(challengeId, userId);
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
    set({ loadingInvitations: true, invitationsError: null });
    const { data, error } = await fetchPendingInvitations(userId);
    set({ pendingInvitations: data, loadingInvitations: false, invitationsError: error });
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

  // ─── Realtime ───────────────────────────────────────────────────────────────

  subscribeToChallengeEvents: (challengeId, userId) => {
    if (_challengeChannel) {
      supabase.removeChannel(_challengeChannel);
      _challengeChannel = null;
    }

    // Refetch on any change rather than patching individual rows client-side:
    // challenge_leaderboard() computes RANK() OVER server-side, which isn't
    // safe to replicate incrementally without risking the client's ranks
    // drifting from the server's.
    const refresh = () => get().loadLeaderboard(challengeId, userId);

    const channel = supabase
      .channel(`challenge-events-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        refresh
      )
      .subscribe();

    _challengeChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      if (_challengeChannel === channel) _challengeChannel = null;
    };
  },

  subscribeToInvitationEvents: (userId) => {
    if (_invitationsChannel) {
      supabase.removeChannel(_invitationsChannel);
      _invitationsChannel = null;
    }

    const channel = supabase
      .channel(`challenge-invitations-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_invitations",
          filter: `invitee_id=eq.${userId}`,
        },
        () => get().loadPendingInvitations(userId)
      )
      .subscribe();

    _invitationsChannel = channel;

    return () => {
      supabase.removeChannel(channel);
      if (_invitationsChannel === channel) _invitationsChannel = null;
    };
  },

  // ─── Reset ──────────────────────────────────────────────────────────────────

  reset: () => {
    if (_challengeChannel) {
      supabase.removeChannel(_challengeChannel);
      _challengeChannel = null;
    }
    if (_invitationsChannel) {
      supabase.removeChannel(_invitationsChannel);
      _invitationsChannel = null;
    }
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
      myRankError: null,
      error: null,
      challenges: [],
      loadingChallenges: false,
      challengesError: null,
      leaderboards: {},
      loadingLeaderboard: {},
      leaderboardErrors: {},
      pendingInvitations: [],
      loadingInvitations: false,
      invitationsError: null,
    });
  },
}));
