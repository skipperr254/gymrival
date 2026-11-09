import { create } from "zustand";
import {
  createFriendsSlice,
  friendsInitialState,
  type FriendsSlice,
} from "./social/friendsSlice";
import { teardownFriendChannel } from "./social/friendsRealtime";
import {
  createFeedSlice,
  feedInitialState,
  type FeedSlice,
} from "./social/feedSlice";
import { teardownFeedChannel } from "./social/feedRealtime";

/**
 * Friends + feed state behind the Social tab. One store, built from two
 * slices in store/social/ that share no state; only reset() spans both.
 */
export type SocialState = FriendsSlice &
  FeedSlice & {
    /** Clears all state and tears down any active realtime channels. Call on sign-out. */
    reset: () => void;
  };

export const useSocialStore = create<SocialState>()((...a) => ({
  ...createFriendsSlice(...a),
  ...createFeedSlice(...a),

  reset: () => {
    teardownFriendChannel();
    teardownFeedChannel();
    a[0]({ ...friendsInitialState(), ...feedInitialState() });
  },
}));
