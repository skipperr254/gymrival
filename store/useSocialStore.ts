import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  fetchProfile,
  searchUsers as apiSearchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from "@/lib/api";
import type { FriendProfile, FriendRequest, UserSearchResult } from "@/types/social";

// Module-level ref so we can clean up and never double-subscribe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _realtimeChannel: any = null;

interface SocialState {
  friends: FriendProfile[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: UserSearchResult[];

  friendsLoading: boolean;
  requestsLoading: boolean;
  searchLoading: boolean;

  // Data loaders
  loadFriends: (userId: string) => Promise<void>;
  loadRequests: (userId: string) => Promise<void>;
  search: (userId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  // Mutations — all use optimistic updates with local reverts on error
  sendRequest: (
    requesterId: string,
    addresseeId: string
  ) => Promise<{ error: string | null }>;
  acceptRequest: (
    friendshipId: string
  ) => Promise<{ error: string | null }>;
  declineRequest: (
    friendshipId: string
  ) => Promise<{ error: string | null }>;
  cancelRequest: (
    friendshipId: string
  ) => Promise<{ error: string | null }>;
  unfriend: (
    friendshipId: string
  ) => Promise<{ error: string | null }>;

  /**
   * Opens a Supabase Realtime channel for the current user's friendships.
   * Returns an unsubscribe function — call it in the useEffect cleanup.
   *
   * Events handled:
   *   INSERT  — someone sent me a request → add to incomingRequests
   *   UPDATE  — my outgoing request was accepted → move to friends
   *   DELETE  — any friendship row removed → clean up all lists
   */
  subscribeToFriendEvents: (userId: string) => () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],

  friendsLoading: false,
  requestsLoading: false,
  searchLoading: false,

  // ─── Loaders ───────────────────────────────────────────────────────────────

  loadFriends: async (userId) => {
    set({ friendsLoading: true });
    const { data, error } = await fetchFriends(userId);
    if (!error) set({ friends: data });
    set({ friendsLoading: false });
  },

  loadRequests: async (userId) => {
    set({ requestsLoading: true });
    const [inc, out] = await Promise.all([
      fetchIncomingRequests(userId),
      fetchOutgoingRequests(userId),
    ]);
    set({
      incomingRequests: inc.error ? get().incomingRequests : inc.data,
      outgoingRequests: out.error ? get().outgoingRequests : out.data,
      requestsLoading: false,
    });
  },

  search: async (userId, query) => {
    set({ searchLoading: true });
    const { data, error } = await apiSearchUsers(userId, query);
    if (!error) set({ searchResults: data });
    set({ searchLoading: false });
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

  // ─── Realtime ───────────────────────────────────────────────────────────────

  subscribeToFriendEvents: (userId) => {
    // Tear down any existing subscription first (handles StrictMode double-mount)
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    _realtimeChannel = supabase
      .channel(`friend-events-${userId}`)

      // ── Someone sent ME a request ──────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships" },
        async (payload) => {
          const row = payload.new as {
            id: string;
            requester_id: string;
            addressee_id: string;
            status: string;
            created_at: string;
          };
          if (row.addressee_id !== userId || row.status !== "pending") return;

          // Fetch the requester's profile so we can display their name/avatar
          const { data: profile } = await fetchProfile(row.requester_id);
          if (!profile) return;

          const newRequest: FriendRequest = {
            friendship_id: row.id,
            created_at: row.created_at,
            user: {
              id: profile.id,
              full_name: profile.full_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
              level: profile.level ?? 1,
              xp: profile.xp ?? 0,
            },
          };

          set((s) => ({
            // De-duplicate in case an optimistic update already added it
            incomingRequests: [
              newRequest,
              ...s.incomingRequests.filter((r) => r.friendship_id !== row.id),
            ],
            searchResults: s.searchResults.map((u) =>
              u.id === row.requester_id
                ? {
                    ...u,
                    friendship_status: "pending" as const,
                    friendship_id: row.id,
                    is_requester: false,
                  }
                : u
            ),
          }));
        }
      )

      // ── My outgoing request was accepted ──────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships" },
        async (payload) => {
          const newRow = payload.new as {
            id: string;
            requester_id: string;
            addressee_id: string;
            status: string;
            created_at: string;
          };

          // Only care about the transition to accepted.
          // We don't check payload.old.status because with REPLICA IDENTITY DEFAULT
          // the old row only contains the primary key — status would be undefined,
          // causing the guard to silently bail. Checking new.status is enough:
          // the only path that sets status='accepted' is the accept flow.
          if (newRow.status !== "accepted") return;
          // Only act when I was the requester — the addressee's side is already
          // handled by the local optimistic update inside acceptRequest().
          if (newRow.requester_id !== userId) return;

          const { data: profile } = await fetchProfile(newRow.addressee_id);
          if (!profile) return;

          const newFriend: FriendProfile = {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            level: profile.level ?? 1,
            xp: profile.xp ?? 0,
            friendship_id: newRow.id,
            friendship_status: "accepted",
            is_requester: true,
          };

          set((s) => ({
            outgoingRequests: s.outgoingRequests.filter(
              (r) => r.friendship_id !== newRow.id
            ),
            // De-duplicate: optimistic accept on same device already added it
            friends: s.friends.some((f) => f.friendship_id === newRow.id)
              ? s.friends
              : [...s.friends, newFriend],
            searchResults: s.searchResults.map((u) =>
              u.id === profile.id
                ? {
                    ...u,
                    friendship_status: "accepted" as const,
                    friendship_id: newRow.id,
                    is_requester: true,
                  }
                : u
            ),
          }));
        }
      )

      // ── Friendship row deleted (unfriend / decline / cancel) ───────────────
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "friendships" },
        (payload) => {
          // payload.old has the full row only if REPLICA IDENTITY FULL is set.
          // With DEFAULT identity, old only contains { id }.
          const oldRow = payload.old as {
            id?: string;
            requester_id?: string;
            addressee_id?: string;
          };
          const friendshipId = oldRow?.id;
          if (!friendshipId) return;

          // Determine who the "other" user was (available with REPLICA IDENTITY FULL)
          const otherUserId =
            oldRow.requester_id === userId
              ? oldRow.addressee_id
              : oldRow.addressee_id === userId
              ? oldRow.requester_id
              : undefined;

          set((s) => ({
            friends: s.friends.filter((f) => f.friendship_id !== friendshipId),
            incomingRequests: s.incomingRequests.filter(
              (r) => r.friendship_id !== friendshipId
            ),
            outgoingRequests: s.outgoingRequests.filter(
              (r) => r.friendship_id !== friendshipId
            ),
            searchResults: otherUserId
              ? s.searchResults.map((u) =>
                  u.id === otherUserId
                    ? {
                        ...u,
                        friendship_status: null,
                        friendship_id: null,
                        is_requester: null,
                      }
                    : u
                )
              : s.searchResults,
          }));
        }
      )

      .subscribe();

    return () => {
      if (_realtimeChannel) {
        supabase.removeChannel(_realtimeChannel);
        _realtimeChannel = null;
      }
    };
  },
}));
