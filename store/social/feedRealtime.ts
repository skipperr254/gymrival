import type { StoreApi } from "zustand";
import { supabase } from "@/lib/supabase";
import { fetchSingleFeedPost, getPRVideoPublicUrl } from "@/lib/api";
import type { PRVideo, PRVideoStatus } from "@/types/pr";
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SocialState } from "../useSocialStore";

// Module-level ref so we can clean up and never double-subscribe
let _feedChannel: RealtimeChannel | null = null;

// Number of this-device optimistic like/unlike ops awaiting their own
// realtime echo, per post id. The realtime handlers consume one slot per
// echo instead of blanket-skipping every event whose actor is "me" — a
// blanket skip also silently dropped genuine likes/unlikes made from a
// second device signed into the same account, since pr_likes rows carry no
// per-device identifier to otherwise distinguish "my own echo" from "a
// second device's real action" beyond this bookkeeping.
export const _pendingOwnLikeOps = new Map<string, number>();

/** Removes the feed-events channel, if open. Used by reset(). */
export function teardownFeedChannel() {
  if (_feedChannel) {
    supabase.removeChannel(_feedChannel);
    _feedChannel = null;
  }
}

/**
 * Opens Supabase Realtime channels for:
 *   - pr_likes INSERT/DELETE  → live like count + has_liked updates
 *   - personal_records INSERT → prepend new posts from friends (and self)
 *   - personal_records DELETE → drop a retracted PR from the feed live
 *   - pr_videos INSERT/UPDATE → attach video proof / update its status
 *
 * Returns an unsubscribe function for useEffect cleanup.
 * Tears down any previous subscription automatically (StrictMode safe).
 */
export function subscribeFeedEvents(
  set: StoreApi<SocialState>["setState"],
  userId: string,
  participantIds: string[],
): () => void {
  if (_feedChannel) {
    supabase.removeChannel(_feedChannel);
    _feedChannel = null;
  }

  const channel = supabase
    .channel(`feed-events-${userId}`)

    // ── Like added ──────────────────────────────────────────────────────────
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "pr_likes" },
      (payload) => {
        const { pr_id, user_id } = payload.new as { pr_id: string; user_id: string };
        if (user_id === userId) {
          // Only skip if this is the echo of a like toggleLike() on THIS
          // device already applied optimistically — a blanket skip on
          // sender === userId would also swallow a genuine like made from
          // a second device signed into the same account.
          const pending = _pendingOwnLikeOps.get(pr_id) ?? 0;
          if (pending > 0) {
            _pendingOwnLikeOps.set(pr_id, pending - 1);
            return;
          }
        }
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id !== pr_id
              ? p
              : { ...p, likes_count: p.likes_count + 1 }
          ),
        }));
      }
    )

    // ── Like removed ────────────────────────────────────────────────────────
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "pr_likes" },
      (payload) => {
        // REPLICA IDENTITY FULL guarantees old row has pr_id + user_id
        const old = payload.old as { pr_id?: string; user_id?: string };
        if (!old.pr_id) return;
        if (old.user_id === userId) {
          // Same pending-slot bookkeeping as the INSERT handler above —
          // shared per prId since each toggleLike() call produces exactly
          // one realtime echo (either this DELETE or the INSERT above).
          const pending = _pendingOwnLikeOps.get(old.pr_id) ?? 0;
          if (pending > 0) {
            _pendingOwnLikeOps.set(old.pr_id, pending - 1);
            return;
          }
        }
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id !== old.pr_id
              ? p
              : { ...p, likes_count: Math.max(0, p.likes_count - 1) }
          ),
        }));
      }
    )

    // ── New PR posted by a participant ──────────────────────────────────────
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "personal_records" },
      async (payload) => {
        const row = payload.new as { id: string; user_id: string };
        if (!participantIds.includes(row.user_id)) return;

        const { data: post } = await fetchSingleFeedPost(userId, row.id);
        if (!post) return;

        set((s) => ({
          // Prepend, de-duplicating in case the current user already sees it
          // via an optimistic local state update elsewhere
          feed: [post, ...s.feed.filter((p) => p.id !== post.id)],
        }));
      }
    )

    // ── PR retracted (by its owner, from any surface/session) ───────────────
    // REPLICA IDENTITY FULL on personal_records (migration 012) guarantees
    // payload.old carries the full row. This is a no-op when the delete
    // originated on this device (deleteFeedPost already removed it
    // optimistically), and is what removes a friend's retracted PR live.
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "personal_records" },
      (payload) => {
        const old = payload.old as { id?: string };
        if (!old.id) return;
        set((s) => ({ feed: s.feed.filter((p) => p.id !== old.id) }));
      }
    )

    // ── Video proof added to a feed post ────────────────────────────────────
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "pr_videos" },
      (payload) => {
        const row = payload.new as {
          id: string;
          pr_id: string;
          user_id: string;
          video_path: string;
          thumbnail_path: string | null;
          duration_sec: number | null;
          video_width: number | null;
          video_height: number | null;
          status: string;
          created_at: string;
        };
        const video: PRVideo = {
          id: row.id,
          pr_id: row.pr_id,
          user_id: row.user_id,
          video_path: row.video_path,
          thumbnail_path: row.thumbnail_path,
          video_url: getPRVideoPublicUrl(row.video_path),
          thumbnail_url: row.thumbnail_path
            ? getPRVideoPublicUrl(row.thumbnail_path)
            : null,
          duration_sec: row.duration_sec,
          video_width: row.video_width ?? null,
          video_height: row.video_height ?? null,
          status: row.status as PRVideoStatus,
          created_at: row.created_at,
        };
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id === row.pr_id ? { ...p, video } : p
          ),
        }));
      }
    )

    // ── Video proof status changed (uploading → ready / failed) ─────────────
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "pr_videos" },
      (payload) => {
        const row = payload.new as {
          id: string;
          pr_id: string;
          user_id: string;
          video_path: string;
          thumbnail_path: string | null;
          duration_sec: number | null;
          status: string;
          created_at: string;
        };
        set((s) => ({
          feed: s.feed.map((p) => {
            if (p.id !== row.pr_id || !p.video) return p;
            return {
              ...p,
              video: {
                ...p.video,
                status: row.status as PRVideoStatus,
                video_path: row.video_path,
                thumbnail_path: row.thumbnail_path,
                // Re-compute URLs in case paths changed (shouldn't happen but be safe)
                video_url: getPRVideoPublicUrl(row.video_path),
                thumbnail_url: row.thumbnail_path
                  ? getPRVideoPublicUrl(row.thumbnail_path)
                  : p.video.thumbnail_url,
              },
            };
          }),
        }));
      }
    )

    .subscribe();

  _feedChannel = channel;

  return () => {
    // Owner-aware cleanup — a stale cleanup must not remove a newer
    // subscriber's channel (see subscribeFriendEvents in friendsRealtime.ts).
    supabase.removeChannel(channel);
    if (_feedChannel === channel) _feedChannel = null;
  };
}
