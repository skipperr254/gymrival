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
  // 1. Get accepted friend IDs
  const { data: friendships, error: friendErr } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted");

  if (friendErr) return { data: [], error: friendErr.message };

  const friendIds = (friendships ?? []).map((f: any) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );

  const participantIds = [userId, ...friendIds];

  // 2. Fetch all PR entries for these users and the selected exercise
  const { data: prRows, error: prErr } = await supabase
    .from("personal_records")
    .select("user_id, value, unit")
    .in("user_id", participantIds)
    .eq("exercise_key", exerciseKey);

  if (prErr) return { data: [], error: prErr.message };

  // 3. Build best PR per user (max value)
  const bestMap = new Map<string, { value: number; unit: ExerciseUnit }>();
  for (const row of prRows ?? []) {
    const existing = bestMap.get(row.user_id);
    const val = Number(row.value);
    if (!existing || val > existing.value) {
      bestMap.set(row.user_id, { value: val, unit: row.unit as ExerciseUnit });
    }
  }

  // Only include users who have a PR for this exercise
  const usersWithPR = participantIds.filter((id) => bestMap.has(id));
  if (usersWithPR.length === 0) return { data: [], error: null };

  // 4. Fetch profiles for those users
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, level")
    .in("id", usersWithPR);

  if (profileErr) return { data: [], error: profileErr.message };

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p])
  );

  // 5. Build ranked entries
  const entries: Omit<RivalEntry, "rank">[] = usersWithPR
    .map((id) => {
      const pr = bestMap.get(id)!;
      const profile = profileMap.get(id);
      return {
        userId: id,
        fullName: profile?.full_name ?? profile?.username ?? "Unknown",
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        level: profile?.level ?? 1,
        bestPR: pr.value,
        unit: pr.unit,
        isMe: id === userId,
      };
    })
    .sort((a, b) => b.bestPR - a.bestPR);

  return {
    data: entries.map((e, i) => ({ ...e, rank: i + 1 })),
    error: null,
  };
}
