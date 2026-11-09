import { create } from "zustand";
import {
  createLeaderboardsSlice,
  leaderboardsInitialState,
  type LeaderboardsSlice,
} from "./compete/leaderboardsSlice";
import {
  createChallengesSlice,
  challengesInitialState,
  teardownChallengeChannels,
  type ChallengesSlice,
} from "./compete/challengesSlice";

/**
 * Leaderboards + challenges state behind the Compete tab. One store, built
 * from two slices in store/compete/ that share no state; only reset() spans
 * both.
 */
export type CompeteState = LeaderboardsSlice &
  ChallengesSlice & {
    reset: () => void;
  };

export const useCompeteStore = create<CompeteState>()((...a) => ({
  ...createLeaderboardsSlice(...a),
  ...createChallengesSlice(...a),

  // ─── Reset ──────────────────────────────────────────────────────────────────

  reset: () => {
    teardownChallengeChannels();
    a[0]({ ...leaderboardsInitialState(), ...challengesInitialState() });
  },
}));
