import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/user";
import type { PersonalRecordWithExercise, ExerciseType, ExerciseUnit } from "@/types/pr";
import type { FriendProfile, FriendshipStatus } from "@/types/social";
import type { RivalEntry } from "@/types/compete";

type ProfileUpdate = Partial<
  Pick<Profile, "username" | "full_name" | "height_cm" | "weight_kg" | "gym" | "goal" | "bio" | "quote">
>;

export async function updateProfile(
  userId: string,
  data: ProfileUpdate
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  return { error: error?.message ?? null };
}

export async function fetchProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data: data as Profile | null, error: error?.message ?? null };
}

export async function fetchBestPRs(
  userId: string,
  limit: number
): Promise<{ data: PersonalRecordWithExercise[]; count: number; error: string | null }> {
  const [prsResult, exercisesResult] = await Promise.all([
    supabase
      .from("personal_records")
      .select("id, user_id, exercise_key, value, unit, created_at")
      .eq("user_id", userId)
      .order("value", { ascending: false }),
    supabase
      .from("exercise_types")
      .select("key, label, icon, unit"),
  ]);

  if (prsResult.error) {
    return { data: [], count: 0, error: prsResult.error.message };
  }

  const exerciseMap = new Map<string, ExerciseType>(
    (exercisesResult.data ?? []).map((e) => [e.key, e as ExerciseType])
  );

  const seen = new Set<string>();
  const deduped: PersonalRecordWithExercise[] = [];

  for (const row of prsResult.data ?? []) {
    if (seen.has(row.exercise_key)) continue;
    seen.add(row.exercise_key);

    const exercise = exerciseMap.get(row.exercise_key);
    if (!exercise) continue;

    deduped.push({
      id: row.id,
      user_id: row.user_id,
      exercise_key: row.exercise_key,
      value: Number(row.value),
      unit: row.unit as ExerciseUnit,
      created_at: row.created_at,
      exercise,
    });
  }

  return { data: deduped.slice(0, limit), count: deduped.length, error: null };
}

export async function togglePro(
  userId: string,
  isPro: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("id", userId);
  return { error: error?.message ?? null };
}

// ─── Exercise Types ────────────────────────────────────────────────────────────

export async function fetchExerciseTypes(): Promise<{ data: ExerciseType[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_types")
    .select("key, label, icon, unit")
    .order("key");
  return {
    data: (data ?? []) as ExerciseType[],
    error: error?.message ?? null,
  };
}

// ─── Friends ───────────────────────────────────────────────────────────────────

export async function fetchFriends(
  userId: string
): Promise<{ data: FriendProfile[]; error: string | null }> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, addressee_id, status,
       requester:profiles!friendships_requester_id_fkey(id, full_name, username, avatar_url, level),
       addressee:profiles!friendships_addressee_id_fkey(id, full_name, username, avatar_url, level)`
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted");

  if (error) return { data: [], error: error.message };

  const friends: FriendProfile[] = (data ?? []).map((row: any) => {
    const isRequester = row.requester_id === userId;
    const other = isRequester ? row.addressee : row.requester;
    return {
      id: other.id,
      full_name: other.full_name,
      username: other.username,
      avatar_url: other.avatar_url,
      level: other.level,
      friendship_id: row.id,
      friendship_status: row.status as FriendshipStatus,
      is_requester: isRequester,
    };
  });

  return { data: friends, error: null };
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: "pending" });
  return { error: error?.message ?? null };
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
  return { error: error?.message ?? null };
}

export async function removeFriend(
  friendshipId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);
  return { error: error?.message ?? null };
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export async function logPersonalRecord(
  userId: string,
  exerciseKey: string,
  value: number,
  unit: ExerciseUnit
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("personal_records")
    .insert({ user_id: userId, exercise_key: exerciseKey, value, unit });
  return { error: error?.message ?? null };
}

// ─── Rivals Leaderboard ────────────────────────────────────────────────────────

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
