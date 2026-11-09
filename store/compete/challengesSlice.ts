import type { StateCreator } from "zustand";
import { supabase } from "@/lib/supabase";
import i18n from "@/lib/i18n";
import type {
  ChallengeWithStats,
  ChallengeLeaderboardEntry,
  ChallengeInvitation,
  CreateFriendChallengeInput,
  CreateAdminChallengeInput,
} from "@/types/challenge";
import {
  fetchActiveChallenges,
  fetchChallengeLeaderboard,
  joinChallenge as apiJoinChallenge,
  leaveChallenge as apiLeaveChallenge,
  createFriendChallenge as apiCreateFriendChallenge,
  fetchPendingInvitations,
  respondToInvitation as apiRespondToInvitation,
  createAdminChallenge as apiCreateAdminChallenge,
  fetchAdminCreatedChallenges,
  cancelChallenge as apiCancelChallenge,
} from "@/lib/api";
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CompeteState } from "../useCompeteStore";

// Realtime channel refs, same owner-aware cleanup pattern as
// useSocialStore/useChatStore. Migration 018 explicitly enabled Realtime on
// challenge_participants/challenge_invitations for exactly this purpose, but
// nothing ever subscribed — a friend joining/leaving/scoring in a challenge
// you're viewing, or a new invite arriving, only appeared after a manual
// refresh or remount.
let _challengeChannel: RealtimeChannel | null = null;
let _invitationsChannel: RealtimeChannel | null = null;

/** Removes both challenge realtime channels, if open. Used by reset(). */
export function teardownChallengeChannels() {
  if (_challengeChannel) {
    supabase.removeChannel(_challengeChannel);
    _challengeChannel = null;
  }
  if (_invitationsChannel) {
    supabase.removeChannel(_invitationsChannel);
    _invitationsChannel = null;
  }
}

export interface ChallengesSlice {
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

  /** Admin-only: challenges created by the current (admin) user, any status */
  myAdminChallenges: ChallengeWithStats[];
  loadingMyAdminChallenges: boolean;
  myAdminChallengesError: string | null;

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

  // Admin
  loadMyAdminChallenges: (adminId: string) => Promise<void>;
  adminCreateChallenge: (
    adminId: string,
    input: CreateAdminChallengeInput,
  ) => Promise<{ challengeId: string | null; error: string | null }>;
  cancelChallenge: (challengeId: string, adminId: string) => Promise<{ error: string | null }>;

  /** Live-updates a single challenge's leaderboard when any participant's
   * score/membership changes. Call when a challenge detail screen mounts.
   * Returns an unsubscribe function for useEffect cleanup. */
  subscribeToChallengeEvents: (challengeId: string, userId: string) => () => void;

  /** Live-updates pendingInvitations when a new invite arrives. Call while
   * the Challenges tab is mounted. Returns an unsubscribe function. */
  subscribeToInvitationEvents: (userId: string) => () => void;
}

/** Fresh initial values, shared by the slice and reset(). */
export const challengesInitialState = () => ({
  challenges: [],
  loadingChallenges: false,
  challengesError: null,

  leaderboards: {},
  loadingLeaderboard: {},
  leaderboardErrors: {},

  pendingInvitations: [],
  loadingInvitations: false,
  invitationsError: null,

  myAdminChallenges: [],
  loadingMyAdminChallenges: false,
  myAdminChallengesError: null,
} satisfies Partial<ChallengesSlice>);

export const createChallengesSlice: StateCreator<CompeteState, [], [], ChallengesSlice> = (set, get) => ({
  ...challengesInitialState(),

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

  // ─── Admin ──────────────────────────────────────────────────────────────────

  loadMyAdminChallenges: async (adminId) => {
    set({ loadingMyAdminChallenges: true, myAdminChallengesError: null });
    const { data, error } = await fetchAdminCreatedChallenges(adminId);
    set({ myAdminChallenges: data, loadingMyAdminChallenges: false, myAdminChallengesError: error });
  },

  adminCreateChallenge: async (adminId, input) => {
    const result = await apiCreateAdminChallenge(adminId, input);
    if (!result.error) {
      await get().loadMyAdminChallenges(adminId);
    }
    return result;
  },

  cancelChallenge: async (challengeId, adminId) => {
    const result = await apiCancelChallenge(challengeId);
    if (!result.error) {
      await get().loadMyAdminChallenges(adminId);
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
});
