import type { StoreApi } from "zustand";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/api";
import type { FriendProfile, FriendRequest } from "@/types/social";
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SocialState } from "../useSocialStore";

// Module-level ref so we can clean up and never double-subscribe
let _friendChannel: RealtimeChannel | null = null;

/** Removes the friend-events channel, if open. Used by reset(). */
export function teardownFriendChannel() {
  if (_friendChannel) {
    supabase.removeChannel(_friendChannel);
    _friendChannel = null;
  }
}

/**
 * Live friend requests, acceptances and unfriends. Returns an unsubscribe
 * function for useEffect cleanup.
 */
export function subscribeFriendEvents(
  set: StoreApi<SocialState>["setState"],
  userId: string,
): () => void {
  // Tear down any existing subscription first (handles StrictMode double-mount)
  if (_friendChannel) {
    supabase.removeChannel(_friendChannel);
    _friendChannel = null;
  }

  const channel = supabase
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

  _friendChannel = channel;

  return () => {
    // Owner-aware cleanup: only clear the module ref if it still points at
    // the channel THIS subscriber created. Both the feed screen (badges) and
    // the Friends screen subscribe; on back-navigation the popped screen's
    // cleanup can run AFTER the feed re-subscribed on focus — it must not
    // kill the fresh channel.
    supabase.removeChannel(channel);
    if (_friendChannel === channel) _friendChannel = null;
  };
}
