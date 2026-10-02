import { supabase } from "@/lib/supabase";
import type { RivalEntry, GlobalLeaderboardEntry } from "@/types/compete";
import type { ExerciseUnit } from "@/types/pr";

const PAGE_SIZE = 50;

function mapGlobalRow(row: any): GlobalLeaderboardEntry {
  return {
    user_id:      row.user_id,
    full_name:    row.full_name   ?? null,
    username:     row.username    ?? null,
    avatar_url:   row.avatar_url  ?? null,
    level:        row.level       ?? 1,
    country_code: row.country_code ?? null,
    bench_pr:     Number(row.bench_pr),
    squat_pr:     Number(row.squat_pr),
    deadlift_pr:  Number(row.deadlift_pr),
    total_kg:     Number(row.total_kg),
    rank:         Number(row.rank),
    is_me:        Boolean(row.is_me),
  };
}

/**
 * Fetch the global leaderboard (ranked by combined bench+squat+deadlift).
 * Pass p_search to filter by username / full_name while keeping global ranks.
 * Supports cursor-based pagination via p_offset.
 */
export async function fetchGlobalLeaderboard(
  viewerId: string,
  search: string | null,
  limit = PAGE_SIZE,
  offset = 0,
): Promise<{ data: GlobalLeaderboardEntry[]; error: string | null }> {
  const { data, error } = await supabase.rpc("global_leaderboard", {
    p_viewer_id: viewerId,
    p_search:    search || null,
    p_limit:     limit,
    p_offset:    offset,
  });

  if (error) return { data: [], error: error.message };
  return { data: ((data as any[]) ?? []).map(mapGlobalRow), error: null };
}

/**
 * Fetch the current user's global rank and big-3 stats.
 * Returns null when the user has not logged any bench, squat, or deadlift PR.
 */
export async function fetchMyGlobalRank(
  userId: string,
): Promise<{ data: GlobalLeaderboardEntry | null; error: string | null }> {
  const { data, error } = await supabase.rpc("my_global_rank", {
    p_user_id: userId,
  });

  if (error) return { data: null, error: error.message };
  const rows = (data as any[]) ?? [];
  return { data: rows.length > 0 ? mapGlobalRow(rows[0]) : null, error: null };
}

export async function fetchRivalsLeaderboard(
  userId: string,
  exerciseKey: string
): Promise<{ data: RivalEntry[]; error: string | null }> {
  // Was: three client-side queries (friendships -> personal_records -> profiles)
  // that read the whole friend group's PRs directly. Migration 054 restricts
  // SELECT on personal_records to "own rows, or public rows", so that version
  // silently started omitting friends' private PRs — a wrong leaderboard that
  // looks like a data bug rather than a permissions one.
  //
  // rivals_leaderboard() is SECURITY DEFINER and derives the friend circle
  // from auth.uid() internally. It deliberately takes no user id: a definer
  // function that accepted one would let any caller read any other user's
  // friends' private PRs.
  const { data, error } = await supabase.rpc("rivals_leaderboard", {
    p_exercise_key: exerciseKey,
  });

  if (error) return { data: [], error: error.message };

  const entries: RivalEntry[] = ((data as any[]) ?? []).map((row, i) => ({
    userId: row.user_id,
    fullName: row.full_name ?? row.username ?? "Unknown",
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    level: row.level ?? 1,
    bestPR: Number(row.best_pr),
    unit: row.unit as ExerciseUnit,
    isMe: row.user_id === userId,
    rank: i + 1,
  }));

  return { data: entries, error: null };
}

