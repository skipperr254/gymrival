/**
 * Behaviour tests for useSocialStore: the friends + feed store behind the
 * Social tab. They pin the store's public shape and its trickiest logic:
 * optimistic updates that must revert on failure, page de-duplication, and the
 * realtime "own echo" bookkeeping that keeps a like from being counted twice
 * while still counting a like made from a second device.
 *
 * The API layer and the Supabase client are mocked. The realtime channel mock
 * records each `.on()` handler by table + event so a test can fire a payload.
 */

type Handler = (payload: Record<string, unknown>) => unknown;

const mockChannels: { name: string; handlers: Map<string, Handler> }[] = [];

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn((name: string) => {
      const entry = { name, handlers: new Map<string, Handler>() };
      mockChannels.push(entry);
      const ch = {
        on: (_type: string, cfg: { event: string; table: string }, handler: Handler) => {
          entry.handlers.set(`${cfg.table}:${cfg.event}`, handler);
          return ch;
        },
        subscribe: () => ch,
        __name: name,
      };
      return ch;
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/lib/api", () => ({
  fetchFriends: jest.fn(),
  fetchIncomingRequests: jest.fn(),
  fetchOutgoingRequests: jest.fn(),
  fetchProfile: jest.fn(),
  searchUsers: jest.fn(),
  sendFriendRequest: jest.fn(),
  acceptFriendRequest: jest.fn(),
  removeFriend: jest.fn(),
  fetchFeed: jest.fn(),
  fetchSingleFeedPost: jest.fn(),
  likePR: jest.fn(),
  unlikePR: jest.fn(),
  deletePersonalRecord: jest.fn(),
  getPRVideoPublicUrl: jest.fn((p: string) => `https://cdn/${p}`),
  FEED_PAGE_SIZE: 20,
}));

const mockProfileStore = {
  loadProfile: jest.fn(),
  loadBestPRs: jest.fn(),
  loadPRHistory: jest.fn(),
};
jest.mock("@/store/useProfileStore", () => ({
  useProfileStore: { getState: () => mockProfileStore },
}));

import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useSocialStore } from "@/store/useSocialStore";
import type { FeedPost, FriendRequest } from "@/types/social";

const mocked = api as jest.Mocked<typeof api>;
const ME = "me";

function post(id: string, over: Partial<FeedPost> = {}): FeedPost {
  return {
    id,
    user_id: "friend",
    exercise_key: "bench",
    exercise_label: "Bench",
    value: 100,
    unit: "kg",
    created_at: `2026-01-${id.padStart(2, "0")}T00:00:00Z`,
    author_name: null,
    author_username: null,
    author_avatar_url: null,
    author_level: 1,
    author_gym: null,
    likes_count: 0,
    has_liked: false,
    video: null,
    ...over,
  } as FeedPost;
}

function request(id: string): FriendRequest {
  return {
    friendship_id: id,
    created_at: "2026-01-01T00:00:00Z",
    user: { id: `u-${id}`, full_name: "A", username: "a", avatar_url: null, level: 1, xp: 0 },
  } as FriendRequest;
}

function lastChannel() {
  return mockChannels[mockChannels.length - 1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChannels.length = 0;
  useSocialStore.getState().reset();
});

describe("public shape", () => {
  it("exposes the same state keys, initial values and actions", () => {
    const s = useSocialStore.getState();
    const values: Record<string, unknown> = {};
    const actions: string[] = [];
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === "function") actions.push(k);
      else values[k] = v;
    }
    expect(values).toEqual({
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      searchResults: [],
      friendsLoading: false,
      requestsLoading: false,
      searchLoading: false,
      friendsError: null,
      requestsError: null,
      searchError: null,
      feed: [],
      feedLoading: false,
      feedLoadingMore: false,
      feedHasMore: true,
      feedParticipantIds: [],
      feedMuted: true,
      feedError: null,
    });
    expect(actions.sort()).toEqual(
      [
        "loadFriends", "loadRequests", "search", "clearSearch",
        "sendRequest", "acceptRequest", "declineRequest", "cancelRequest", "unfriend",
        "subscribeToFriendEvents",
        "setFeedMuted", "loadFeed", "loadMoreFeed", "toggleLike", "deleteFeedPost",
        "subscribeToFeedEvents", "reset",
      ].sort()
    );
  });
});

describe("friends", () => {
  it("acceptRequest moves the request into friends, and reverts on failure", async () => {
    useSocialStore.setState({ incomingRequests: [request("f1")] });

    mocked.acceptFriendRequest.mockResolvedValueOnce({ error: null } as never);
    await useSocialStore.getState().acceptRequest("f1");
    expect(useSocialStore.getState().incomingRequests).toHaveLength(0);
    expect(useSocialStore.getState().friends.map((f) => f.friendship_id)).toEqual(["f1"]);

    useSocialStore.setState({ incomingRequests: [request("f2")], friends: [] });
    mocked.acceptFriendRequest.mockResolvedValueOnce({ error: "boom" } as never);
    const res = await useSocialStore.getState().acceptRequest("f2");
    expect(res.error).toBe("boom");
    expect(useSocialStore.getState().incomingRequests.map((r) => r.friendship_id)).toEqual(["f2"]);
    expect(useSocialStore.getState().friends).toHaveLength(0);
  });

  it("loadRequests keeps the previous list for a side whose fetch failed", async () => {
    useSocialStore.setState({ outgoingRequests: [request("old")] });
    mocked.fetchIncomingRequests.mockResolvedValueOnce({ data: [request("in")], error: null } as never);
    mocked.fetchOutgoingRequests.mockResolvedValueOnce({ data: [], error: "net" } as never);
    await useSocialStore.getState().loadRequests(ME);
    const s = useSocialStore.getState();
    expect(s.incomingRequests.map((r) => r.friendship_id)).toEqual(["in"]);
    expect(s.outgoingRequests.map((r) => r.friendship_id)).toEqual(["old"]);
    expect(s.requestsError).toBe("net");
  });
});

describe("feed", () => {
  it("loadFeed includes the viewer and friends as participants", async () => {
    mocked.fetchFriends.mockResolvedValueOnce({ data: [{ id: "f" }], error: null } as never);
    mocked.fetchFeed.mockResolvedValueOnce({ data: [post("1")], hasMore: true, error: null } as never);
    await useSocialStore.getState().loadFeed(ME);
    expect(mocked.fetchFeed).toHaveBeenCalledWith(ME, [ME, "f"], { limit: 20 });
    expect(useSocialStore.getState().feedParticipantIds).toEqual([ME, "f"]);
    expect(useSocialStore.getState().feed.map((p) => p.id)).toEqual(["1"]);
  });

  it("loadMoreFeed pages from the oldest post and de-duplicates", async () => {
    useSocialStore.setState({ feed: [post("3"), post("2")], feedParticipantIds: [ME] });
    mocked.fetchFeed.mockResolvedValueOnce({ data: [post("2"), post("1")], hasMore: false, error: null } as never);
    await useSocialStore.getState().loadMoreFeed(ME);
    expect(mocked.fetchFeed).toHaveBeenCalledWith(ME, [ME], { limit: 20, before: post("2").created_at });
    expect(useSocialStore.getState().feed.map((p) => p.id)).toEqual(["3", "2", "1"]);
    expect(useSocialStore.getState().feedHasMore).toBe(false);
  });

  it("toggleLike updates optimistically and reverts when the write fails", async () => {
    useSocialStore.setState({ feed: [post("1")] });
    mocked.likePR.mockResolvedValueOnce({ error: "boom" } as never);
    const pending = useSocialStore.getState().toggleLike(ME, "1");
    expect(useSocialStore.getState().feed[0]).toMatchObject({ has_liked: true, likes_count: 1 });
    await pending;
    expect(useSocialStore.getState().feed[0]).toMatchObject({ has_liked: false, likes_count: 0 });
  });

  it("deleteFeedPost restores the post in place when the delete fails", async () => {
    useSocialStore.setState({ feed: [post("3"), post("2"), post("1")] });
    mocked.deletePersonalRecord.mockResolvedValueOnce({ error: "boom" } as never);
    const res = await useSocialStore.getState().deleteFeedPost(ME, "2");
    expect(res.error).toBe("boom");
    expect(useSocialStore.getState().feed.map((p) => p.id)).toEqual(["3", "2", "1"]);
    expect(mockProfileStore.loadProfile).not.toHaveBeenCalled();
  });

  it("deleteFeedPost refreshes the profile after a successful delete", async () => {
    useSocialStore.setState({ feed: [post("1")] });
    mocked.deletePersonalRecord.mockResolvedValueOnce({ error: null } as never);
    await useSocialStore.getState().deleteFeedPost(ME, "1");
    expect(useSocialStore.getState().feed).toHaveLength(0);
    expect(mockProfileStore.loadProfile).toHaveBeenCalledWith(ME);
    expect(mockProfileStore.loadPRHistory).toHaveBeenCalledWith(ME);
  });
});

describe("feed realtime", () => {
  it("skips this device's own like echo once, but counts a like from a second device", async () => {
    useSocialStore.setState({ feed: [post("1")] });
    useSocialStore.getState().subscribeToFeedEvents(ME, [ME]);
    const onLike = lastChannel().handlers.get("pr_likes:INSERT")!;

    mocked.likePR.mockResolvedValueOnce({ error: null } as never);
    await useSocialStore.getState().toggleLike(ME, "1");
    expect(useSocialStore.getState().feed[0].likes_count).toBe(1);

    onLike({ new: { pr_id: "1", user_id: ME } }); // echo of the toggle above
    expect(useSocialStore.getState().feed[0].likes_count).toBe(1);

    onLike({ new: { pr_id: "1", user_id: ME } }); // same account, other device
    expect(useSocialStore.getState().feed[0].likes_count).toBe(2);
  });

  it("prepends a participant's new PR and ignores non-participants", async () => {
    useSocialStore.setState({ feed: [post("1")] });
    useSocialStore.getState().subscribeToFeedEvents(ME, [ME, "friend"]);
    const onPR = lastChannel().handlers.get("personal_records:INSERT")!;

    await onPR({ new: { id: "9", user_id: "stranger" } });
    expect(mocked.fetchSingleFeedPost).not.toHaveBeenCalled();

    mocked.fetchSingleFeedPost.mockResolvedValueOnce({ data: post("2"), error: null } as never);
    await onPR({ new: { id: "2", user_id: "friend" } });
    expect(useSocialStore.getState().feed.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("a stale cleanup doesn't tear down a newer subscription", () => {
    const cleanupOld = useSocialStore.getState().subscribeToFeedEvents(ME, [ME]);
    useSocialStore.getState().subscribeToFeedEvents(ME, [ME]);
    (supabase.removeChannel as jest.Mock).mockClear();
    cleanupOld();
    // The old channel is removed; reset must still find and remove the new one.
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    useSocialStore.getState().reset();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
  });
});

describe("friends realtime", () => {
  it("adds an incoming request and drops a deleted friendship", async () => {
    useSocialStore.getState().subscribeToFriendEvents(ME);
    const ch = lastChannel();
    mocked.fetchProfile.mockResolvedValueOnce({
      data: { id: "u1", full_name: "U", username: "u", avatar_url: null, level: 2, xp: 5 },
      error: null,
    } as never);

    await ch.handlers.get("friendships:INSERT")!({
      new: { id: "f1", requester_id: "u1", addressee_id: ME, status: "pending", created_at: "t" },
    });
    expect(useSocialStore.getState().incomingRequests.map((r) => r.friendship_id)).toEqual(["f1"]);

    ch.handlers.get("friendships:DELETE")!({ old: { id: "f1" } });
    expect(useSocialStore.getState().incomingRequests).toHaveLength(0);
  });
});

describe("reset", () => {
  it("removes both realtime channels and clears state", () => {
    useSocialStore.getState().subscribeToFeedEvents(ME, [ME]);
    useSocialStore.getState().subscribeToFriendEvents(ME);
    useSocialStore.setState({ feed: [post("1")], feedMuted: false });
    (supabase.removeChannel as jest.Mock).mockClear();
    useSocialStore.getState().reset();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    expect(useSocialStore.getState().feed).toEqual([]);
    expect(useSocialStore.getState().feedMuted).toBe(true);
  });
});
