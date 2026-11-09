import {
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  searchUsers as apiSearchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from "@/lib/api";
import type { FriendProfile, FriendRequest, UserSearchResult } from "@/types/social";
import type { StateCreator } from "zustand";
import type { SocialState } from "../useSocialStore";
import { subscribeFriendEvents } from "./friendsRealtime";

export interface FriendsSlice {
  // ── Friends ──────────────────────────────────────────────────────────────────
  friends: FriendProfile[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: UserSearchResult[];

  friendsLoading: boolean;
  requestsLoading: boolean;
  searchLoading: boolean;

  // Set (non-null) when the last fetch failed, so screens can render a
  // retry state instead of treating a network error as "genuinely empty".
  friendsError: string | null;
  requestsError: string | null;
  searchError: string | null;

  loadFriends: (userId: string) => Promise<void>;
  loadRequests: (userId: string) => Promise<void>;
  search: (userId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  sendRequest: (requesterId: string, addresseeId: string) => Promise<{ error: string | null }>;
  acceptRequest: (friendshipId: string) => Promise<{ error: string | null }>;
  declineRequest: (friendshipId: string) => Promise<{ error: string | null }>;
  cancelRequest: (friendshipId: string) => Promise<{ error: string | null }>;
  unfriend: (friendshipId: string) => Promise<{ error: string | null }>;

  subscribeToFriendEvents: (userId: string) => () => void;
}

/** Fresh initial values (new arrays each call), shared by the slice and reset(). */
export const friendsInitialState = () => ({
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
} satisfies Partial<FriendsSlice>);

export const createFriendsSlice: StateCreator<SocialState, [], [], FriendsSlice> = (set, get) => ({
  ...friendsInitialState(),

  // ─── Loaders ───────────────────────────────────────────────────────────────

  loadFriends: async (userId) => {
    set({ friendsLoading: true, friendsError: null });
    const { data, error } = await fetchFriends(userId);
    if (!error) set({ friends: data });
    set({ friendsLoading: false, friendsError: error });
  },

  loadRequests: async (userId) => {
    set({ requestsLoading: true, requestsError: null });
    const [inc, out] = await Promise.all([
      fetchIncomingRequests(userId),
      fetchOutgoingRequests(userId),
    ]);
    set({
      incomingRequests: inc.error ? get().incomingRequests : inc.data,
      outgoingRequests: out.error ? get().outgoingRequests : out.data,
      requestsError: inc.error ?? out.error,
      requestsLoading: false,
    });
  },

  search: async (userId, query) => {
    set({ searchLoading: true, searchError: null });
    const { data, error } = await apiSearchUsers(userId, query);
    if (!error) set({ searchResults: data });
    set({ searchLoading: false, searchError: error });
  },

  clearSearch: () => set({ searchResults: [] }),

  // ─── Mutations ─────────────────────────────────────────────────────────────

  sendRequest: async (requesterId, addresseeId) => {
    // Optimistic: mark user as pending/outgoing in search results
    set((s) => ({
      searchResults: s.searchResults.map((u) =>
        u.id === addresseeId
          ? { ...u, friendship_status: "pending" as const, is_requester: true }
          : u
      ),
    }));

    const { error } = await sendFriendRequest(requesterId, addresseeId);

    if (error) {
      // Revert
      set((s) => ({
        searchResults: s.searchResults.map((u) =>
          u.id === addresseeId
            ? { ...u, friendship_status: null, is_requester: null, friendship_id: null }
            : u
        ),
      }));
    } else {
      // Reload outgoing requests so REQUESTS tab shows the new entry with correct ID
      get().loadRequests(requesterId);
    }

    return { error };
  },

  acceptRequest: async (friendshipId) => {
    const request = get().incomingRequests.find(
      (r) => r.friendship_id === friendshipId
    );
    if (!request) return { error: "Request not found" };

    const newFriend: FriendProfile = {
      id: request.user.id,
      full_name: request.user.full_name,
      username: request.user.username,
      avatar_url: request.user.avatar_url,
      level: request.user.level,
      xp: request.user.xp,
      friendship_id: friendshipId,
      friendship_status: "accepted",
      is_requester: false,
    };

    // Optimistic: move from incoming → friends list
    set((s) => ({
      incomingRequests: s.incomingRequests.filter(
        (r) => r.friendship_id !== friendshipId
      ),
      friends: [...s.friends, newFriend],
      searchResults: s.searchResults.map((u) =>
        u.id === request.user.id
          ? { ...u, friendship_status: "accepted" as const, friendship_id: friendshipId, is_requester: false }
          : u
      ),
    }));

    const { error } = await acceptFriendRequest(friendshipId);

    if (error) {
      // Revert
      set((s) => ({
        incomingRequests: [request, ...s.incomingRequests],
        friends: s.friends.filter((f) => f.friendship_id !== friendshipId),
        searchResults: s.searchResults.map((u) =>
          u.id === request.user.id
            ? {
                ...u,
                friendship_status: "pending" as const,
                friendship_id: friendshipId,
                is_requester: false,
              }
            : u
        ),
      }));
    }

    return { error };
  },

  declineRequest: async (friendshipId) => {
    const request = get().incomingRequests.find(
      (r) => r.friendship_id === friendshipId
    );

    // Optimistic: remove from incoming list
    set((s) => ({
      incomingRequests: s.incomingRequests.filter(
        (r) => r.friendship_id !== friendshipId
      ),
      searchResults: s.searchResults.map((u) =>
        u.id === request?.user.id
          ? { ...u, friendship_status: null, friendship_id: null, is_requester: null }
          : u
      ),
    }));

    const { error } = await removeFriend(friendshipId);

    if (error && request) {
      // Revert
      set((s) => ({
        incomingRequests: [request, ...s.incomingRequests],
      }));
    }

    return { error };
  },

  cancelRequest: async (friendshipId) => {
    const request = get().outgoingRequests.find(
      (r) => r.friendship_id === friendshipId
    );

    // Optimistic: remove from outgoing list
    set((s) => ({
      outgoingRequests: s.outgoingRequests.filter(
        (r) => r.friendship_id !== friendshipId
      ),
      searchResults: s.searchResults.map((u) =>
        u.id === request?.user.id
          ? { ...u, friendship_status: null, friendship_id: null, is_requester: null }
          : u
      ),
    }));

    const { error } = await removeFriend(friendshipId);

    if (error && request) {
      // Revert
      set((s) => ({
        outgoingRequests: [...s.outgoingRequests, request],
      }));
    }

    return { error };
  },

  unfriend: async (friendshipId) => {
    const friend = get().friends.find(
      (f) => f.friendship_id === friendshipId
    );

    // Optimistic: remove from friends list
    set((s) => ({
      friends: s.friends.filter((f) => f.friendship_id !== friendshipId),
      searchResults: s.searchResults.map((u) =>
        u.id === friend?.id
          ? { ...u, friendship_status: null, friendship_id: null, is_requester: null }
          : u
      ),
    }));

    const { error } = await removeFriend(friendshipId);

    if (error && friend) {
      // Revert
      set((s) => ({ friends: [...s.friends, friend] }));
    }

    return { error };
  },

  // ─── Friends realtime ───────────────────────────────────────────────────────

  subscribeToFriendEvents: (userId) => subscribeFriendEvents(set, userId),
});
