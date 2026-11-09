import {
  fetchFriends,
  fetchFeed,
  likePR,
  unlikePR,
  deletePersonalRecord,
  FEED_PAGE_SIZE,
} from "@/lib/api";
import { useProfileStore } from "@/store/useProfileStore";
import type { FeedPost } from "@/types/social";
import type { StateCreator } from "zustand";
import type { SocialState } from "../useSocialStore";
import { _pendingOwnLikeOps, subscribeFeedEvents } from "./feedRealtime";

// Per-post monotonic sequence number for toggleLike — lets a slow/failed
// response know whether a newer toggle for the same post has since been
// issued, so it doesn't revert the optimistic UI out from under a more
// recent tap (a rapid like→unlike→like burst produces overlapping requests
// that can resolve out of order).
const _likeRequestSeq = new Map<string, number>();

export interface FeedSlice {
  // ── Feed ─────────────────────────────────────────────────────────────────────
  feed: FeedPost[];
  feedLoading: boolean;
  feedLoadingMore: boolean;
  feedHasMore: boolean;
  /** IDs of users whose PRs appear in the feed (current user + accepted friends) */
  feedParticipantIds: string[];
  /**
   * Global feed mute (Instagram-style): videos autoplay muted; unmuting one
   * keeps subsequent videos unmuted. Session-scoped — not persisted.
   */
  feedMuted: boolean;
  setFeedMuted: (muted: boolean) => void;
  /** Set (non-null) when the last feed fetch failed. */
  feedError: string | null;

  /**
   * Loads the first feed page: fetches accepted friend IDs, then fetches the
   * combined personal_records feed with like counts. Stores participantIds for
   * the realtime subscription to use. Also serves as the pull-to-refresh reset.
   */
  loadFeed: (userId: string) => Promise<void>;

  /** Loads the next page (keyset cursor on the oldest loaded post's created_at). */
  loadMoreFeed: (userId: string) => Promise<void>;

  /**
   * Optimistically toggles a like on a feed post and syncs to the database.
   * Reverts the optimistic update if the API call fails.
   */
  toggleLike: (userId: string, prId: string) => Promise<void>;

  /**
   * Optimistically removes a post the user owns from the feed, then deletes
   * it server-side. On failure the post is restored. Also refreshes the
   * profile store (XP/level clawback happens server-side) and the owner's
   * PR History / best-PRs, since a post can be deleted from the feed without
   * ever visiting those screens.
   */
  deleteFeedPost: (userId: string, prId: string) => Promise<{ error: string | null }>;

  /**
   * Opens Supabase Realtime channels for:
   *   - pr_likes INSERT/DELETE  → live like count + has_liked updates
   *   - personal_records INSERT → prepend new posts from friends (and self)
   *   - personal_records DELETE → drop a retracted PR from the feed live
   *
   * Returns an unsubscribe function for useEffect cleanup.
   * Tears down any previous subscription automatically (StrictMode safe).
   */
  subscribeToFeedEvents: (userId: string, participantIds: string[]) => () => void;
}

/** Fresh initial values (new arrays each call), shared by the slice and reset(). */
export const feedInitialState = () => ({
  feed: [],
  feedLoading: false,
  feedLoadingMore: false,
  feedHasMore: true,
  feedParticipantIds: [],
  feedMuted: true,
  feedError: null,
} satisfies Partial<FeedSlice>);

export const createFeedSlice: StateCreator<SocialState, [], [], FeedSlice> = (set, get) => ({
  ...feedInitialState(),

  setFeedMuted: (muted) => set({ feedMuted: muted }),

  // ─── Feed actions ───────────────────────────────────────────────────────────

  loadFeed: async (userId) => {
    set({ feedLoading: true, feedError: null });

    // 1. Get accepted friend IDs so we can include them in the feed query
    const { data: friends, error: friendErr } = await fetchFriends(userId);
    if (friendErr) {
      set({ feedLoading: false, feedError: friendErr });
      return;
    }

    const friendIds = friends.map((f) => f.id);
    const participantIds = [userId, ...friendIds];
    set({ feedParticipantIds: participantIds });

    // 2. Fetch the first page of feed posts
    const { data, hasMore, error } = await fetchFeed(userId, participantIds, {
      limit: FEED_PAGE_SIZE,
    });
    if (!error) set({ feed: data, feedHasMore: hasMore });
    set({ feedLoading: false, feedError: error });
  },

  loadMoreFeed: async (userId) => {
    const s = get();
    if (s.feedLoadingMore || s.feedLoading || !s.feedHasMore || s.feed.length === 0) return;

    set({ feedLoadingMore: true });

    const cursor = s.feed[s.feed.length - 1].created_at;
    const { data, hasMore, error } = await fetchFeed(userId, s.feedParticipantIds, {
      limit: FEED_PAGE_SIZE,
      before: cursor,
    });

    if (!error) {
      set((state) => ({
        // De-dupe by id: realtime prepends or created_at ties could overlap pages
        feed: [
          ...state.feed,
          ...data.filter((p) => !state.feed.some((q) => q.id === p.id)),
        ],
        feedHasMore: hasMore,
      }));
    }
    set({ feedLoadingMore: false });
  },

  toggleLike: async (userId, prId) => {
    const post = get().feed.find((p) => p.id === prId);
    if (!post) return;

    const wasLiked = post.has_liked;
    const mySeq = (_likeRequestSeq.get(prId) ?? 0) + 1;
    _likeRequestSeq.set(prId, mySeq);
    _pendingOwnLikeOps.set(prId, (_pendingOwnLikeOps.get(prId) ?? 0) + 1);

    // Optimistic update
    set((s) => ({
      feed: s.feed.map((p) =>
        p.id !== prId
          ? p
          : {
              ...p,
              has_liked: !wasLiked,
              likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
            }
      ),
    }));

    const { error } = wasLiked
      ? await unlikePR(userId, prId)
      : await likePR(userId, prId);

    if (error) {
      // The write never happened, so it will never get a matching realtime
      // echo — release the pending slot so a later genuine event isn't
      // incorrectly swallowed.
      _pendingOwnLikeOps.set(prId, Math.max(0, (_pendingOwnLikeOps.get(prId) ?? 1) - 1));
      // Only revert if no newer toggle for this post was issued while this
      // one was in flight — otherwise this stale failure would stomp on
      // whatever more recent optimistic state the user has already moved to.
      if (_likeRequestSeq.get(prId) !== mySeq) return;
      set((s) => ({
        feed: s.feed.map((p) =>
          p.id !== prId
            ? p
            : {
                ...p,
                has_liked: wasLiked,
                likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
              }
        ),
      }));
    }
  },

  deleteFeedPost: async (userId, prId) => {
    const post = get().feed.find((p) => p.id === prId);
    if (!post) return { error: null };

    set((s) => ({ feed: s.feed.filter((p) => p.id !== prId) }));

    const { error } = await deletePersonalRecord(prId);

    if (error) {
      // Restore in its original position rather than re-prepending, in case
      // other posts arrived (via realtime) while the delete was in flight.
      set((s) => {
        if (s.feed.some((p) => p.id === prId)) return s;
        const idx = s.feed.findIndex((p) => p.created_at < post.created_at);
        const feed = [...s.feed];
        feed.splice(idx === -1 ? feed.length : idx, 0, post);
        return { feed };
      });
      return { error };
    }

    // XP clawback happens server-side — refresh the profile, and PR History
    // / best-PRs since the user may not revisit those screens this session.
    const profileStore = useProfileStore.getState();
    await Promise.all([
      profileStore.loadProfile(userId),
      profileStore.loadBestPRs(userId),
      profileStore.loadPRHistory(userId),
    ]);

    return { error: null };
  },

  subscribeToFeedEvents: (userId, participantIds) => subscribeFeedEvents(set, userId, participantIds),
});
