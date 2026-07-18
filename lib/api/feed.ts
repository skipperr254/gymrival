import { supabase } from "@/lib/supabase";
import type { FeedPost } from "@/types/social";
import type { PRVideo, PRVideoStatus } from "@/types/pr";
import { getPRVideoPublicUrl } from "./pr";

const FEED_SELECT = `
  id, user_id, exercise_key, value, unit, created_at,
  profiles!personal_records_user_id_fkey(full_name, username, avatar_url, level, gym),
  exercise_types!personal_records_exercise_key_fkey(label, unit),
  pr_likes(id, user_id),
  pr_videos(id, user_id, video_path, thumbnail_path, duration_sec, video_width, video_height, status, created_at)
` as const;

export const FEED_PAGE_SIZE = 20;

function mapFeedRow(row: any, currentUserId: string): FeedPost {
  // PostgREST returns an array for most reverse-FK joins, but returns a single object
  // (or null) when it detects a UNIQUE constraint on the FK column. Handle both shapes.
  const videoRow = Array.isArray(row.pr_videos) ? (row.pr_videos[0] ?? null) : (row.pr_videos ?? null);
  const video: PRVideo | null = videoRow
    ? {
        id: videoRow.id,
        pr_id: row.id,
        user_id: videoRow.user_id,
        video_url: getPRVideoPublicUrl(videoRow.video_path),
        thumbnail_url: videoRow.thumbnail_path
          ? getPRVideoPublicUrl(videoRow.thumbnail_path)
          : null,
        duration_sec: videoRow.duration_sec ?? null,
        video_width: videoRow.video_width ?? null,
        video_height: videoRow.video_height ?? null,
        status: videoRow.status as PRVideoStatus,
        created_at: videoRow.created_at,
      }
    : null;

  return {
    id: row.id,
    user_id: row.user_id,
    exercise_key: row.exercise_key,
    exercise_label: row.profiles
      ? (row.exercise_types?.label ?? row.exercise_key)
      : row.exercise_key,
    value: Number(row.value),
    unit: row.unit,
    created_at: row.created_at,
    author_name: row.profiles?.full_name ?? null,
    author_username: row.profiles?.username ?? null,
    author_avatar_url: row.profiles?.avatar_url ?? null,
    author_level: row.profiles?.level ?? 1,
    author_gym: row.profiles?.gym ?? null,
    likes_count: Array.isArray(row.pr_likes) ? row.pr_likes.length : 0,
    has_liked: Array.isArray(row.pr_likes)
      ? row.pr_likes.some((l: any) => l.user_id === currentUserId)
      : false,
    video,
  };
}

/**
 * Fetch the social feed: the most recent PRs from the current user and their
 * accepted friends, enriched with author profiles and like counts.
 *
 * Pagination is keyset-based on created_at (`before` = the created_at of the
 * oldest post already loaded). Keyset cursors stay stable when realtime events
 * prepend new posts, unlike offset ranges. Two posts sharing an exact
 * created_at across a page boundary could be dropped or duplicated; duplicates
 * are deduped by id in the store, and the drop risk is negligible for this
 * data shape.
 */
export async function fetchFeed(
  currentUserId: string,
  participantIds: string[],
  opts: { limit?: number; before?: string } = {}
): Promise<{ data: FeedPost[]; hasMore: boolean; error: string | null }> {
  const limit = opts.limit ?? FEED_PAGE_SIZE;
  if (participantIds.length === 0) return { data: [], hasMore: false, error: null };

  let query = supabase
    .from("personal_records")
    .select(FEED_SELECT)
    .in("user_id", participantIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.before) query = query.lt("created_at", opts.before);

  const { data, error } = await query;

  if (error) return { data: [], hasMore: false, error: error.message };

  const rows = data ?? [];
  return {
    data: rows.map((row: any) => mapFeedRow(row, currentUserId)),
    hasMore: rows.length === limit,
    error: null,
  };
}

/**
 * Fetch a single feed post by its personal_record ID.
 * Used by the realtime handler to hydrate a new PR event into a full FeedPost.
 */
export async function fetchSingleFeedPost(
  currentUserId: string,
  prId: string
): Promise<{ data: FeedPost | null; error: string | null }> {
  const { data, error } = await supabase
    .from("personal_records")
    .select(FEED_SELECT)
    .eq("id", prId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapFeedRow(data, currentUserId), error: null };
}

/** Insert a like for the given PR. Silently ignores duplicate-key errors. */
export async function likePR(
  userId: string,
  prId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("pr_likes")
    .insert({ user_id: userId, pr_id: prId });
  // 23505 = unique_violation — already liked
  if (error && error.code !== "23505") return { error: error.message };
  return { error: null };
}

/** Delete the current user's like for the given PR. */
export async function unlikePR(
  userId: string,
  prId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("pr_likes")
    .delete()
    .eq("user_id", userId)
    .eq("pr_id", prId);
  return { error: error?.message ?? null };
}
