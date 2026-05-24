import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/user";
import type { PersonalRecordWithExercise, ExerciseType, ExerciseUnit, PRHistoryGroup, PRHistoryEntry } from "@/types/pr";
import type { FriendProfile, FriendRequest, FriendshipStatus, UserSearchResult, FeedPost, Message, ConversationPreview, UserPresence } from "@/types/social";
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
       requester:profiles!friendships_requester_id_fkey(id, full_name, username, avatar_url, level, xp),
       addressee:profiles!friendships_addressee_id_fkey(id, full_name, username, avatar_url, level, xp)`
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
      level: other.level ?? 1,
      xp: other.xp ?? 0,
      friendship_id: row.id,
      friendship_status: row.status as FriendshipStatus,
      is_requester: isRequester,
    };
  });

  return { data: friends, error: null };
}

export async function fetchIncomingRequests(
  userId: string
): Promise<{ data: FriendRequest[]; error: string | null }> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, created_at,
       requester:profiles!friendships_requester_id_fkey(id, full_name, username, avatar_url, level, xp)`
    )
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const requests: FriendRequest[] = (data ?? []).map((row: any) => ({
    friendship_id: row.id,
    created_at: row.created_at,
    user: {
      id: row.requester.id,
      full_name: row.requester.full_name,
      username: row.requester.username,
      avatar_url: row.requester.avatar_url,
      level: row.requester.level ?? 1,
      xp: row.requester.xp ?? 0,
    },
  }));

  return { data: requests, error: null };
}

export async function fetchOutgoingRequests(
  userId: string
): Promise<{ data: FriendRequest[]; error: string | null }> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, created_at,
       addressee:profiles!friendships_addressee_id_fkey(id, full_name, username, avatar_url, level, xp)`
    )
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const requests: FriendRequest[] = (data ?? []).map((row: any) => ({
    friendship_id: row.id,
    created_at: row.created_at,
    user: {
      id: row.addressee.id,
      full_name: row.addressee.full_name,
      username: row.addressee.username,
      avatar_url: row.addressee.avatar_url,
      level: row.addressee.level ?? 1,
      xp: row.addressee.xp ?? 0,
    },
  }));

  return { data: requests, error: null };
}

/**
 * Search for users by name or username, enriched with the current user's
 * relationship to each result.
 *
 * When query is empty, returns the most recently joined users who are not
 * yet accepted friends or blocked — i.e. a "suggested" list.
 *
 * When query is non-empty, searches all profiles via ILIKE and includes
 * existing friends/pending users so the caller can show the correct status.
 */
export async function searchUsers(
  currentUserId: string,
  query: string,
  limit = 30
): Promise<{ data: UserSearchResult[]; error: string | null }> {
  // Step 1 — build a map of all existing relationships for the current user
  const { data: myFriendships, error: fErr } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

  if (fErr) return { data: [], error: fErr.message };

  const friendshipMap = new Map<
    string,
    { id: string; status: FriendshipStatus; is_requester: boolean }
  >();
  // IDs to exclude in suggested mode (accepted friends + blocked on either side)
  const excludedFromSuggested = new Set<string>([currentUserId]);

  for (const f of myFriendships ?? []) {
    const otherId =
      f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
    const isRequester = f.requester_id === currentUserId;
    const status = f.status as FriendshipStatus;

    if (status !== "blocked") {
      friendshipMap.set(otherId, { id: f.id, status, is_requester: isRequester });
    }
    if (status === "accepted" || status === "blocked") {
      excludedFromSuggested.add(otherId);
    }
  }

  // Step 2 — fetch matching profiles
  const trimmed = query.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profileQuery: any = supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, level, xp")
    .neq("id", currentUserId)
    .limit(limit);

  if (trimmed) {
    // Search mode: ILIKE across username and full_name
    profileQuery = profileQuery.or(
      `username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`
    );
  } else {
    // Suggested mode: newest users not yet connected
    const excluded = Array.from(excludedFromSuggested);
    if (excluded.length > 0) {
      profileQuery = profileQuery.not("id", "in", `(${excluded.join(",")})`);
    }
    profileQuery = profileQuery.order("created_at", { ascending: false });
  }

  const { data: profiles, error: pErr } = await profileQuery;
  if (pErr) return { data: [], error: pErr.message };

  const results: UserSearchResult[] = (profiles ?? []).map((p: any) => {
    const rel = friendshipMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      level: p.level ?? 1,
      xp: p.xp ?? 0,
      friendship_id: rel?.id ?? null,
      friendship_status: rel?.status ?? null,
      is_requester: rel !== undefined ? rel.is_requester : null,
    };
  });

  return { data: results, error: null };
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

export async function fetchPRHistory(
  userId: string
): Promise<{ data: PRHistoryGroup[]; error: string | null }> {
  const [prsResult, exercisesResult] = await Promise.all([
    supabase
      .from("personal_records")
      .select("id, exercise_key, value, unit, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("exercise_types")
      .select("key, label, icon, unit"),
  ]);

  if (prsResult.error) return { data: [], error: prsResult.error.message };

  const exerciseMap = new Map<string, ExerciseType>(
    (exercisesResult.data ?? []).map((e) => [e.key, e as ExerciseType])
  );

  const groupMap = new Map<string, PRHistoryGroup>();

  for (const row of prsResult.data ?? []) {
    const exercise = exerciseMap.get(row.exercise_key);
    if (!exercise) continue;

    const entry: PRHistoryEntry = {
      id: row.id,
      value: Number(row.value),
      unit: row.unit as ExerciseUnit,
      created_at: row.created_at,
    };

    if (!groupMap.has(row.exercise_key)) {
      groupMap.set(row.exercise_key, { exercise, best: entry.value, entries: [] });
    }

    const group = groupMap.get(row.exercise_key)!;
    group.entries.push(entry);
    if (entry.value > group.best) group.best = entry.value;
  }

  return { data: Array.from(groupMap.values()), error: null };
}

// ─── Social Feed ──────────────────────────────────────────────────────────────

const FEED_SELECT = `
  id, user_id, exercise_key, value, unit, created_at,
  profiles!personal_records_user_id_fkey(full_name, username, avatar_url, level, gym),
  exercise_types!personal_records_exercise_key_fkey(label, unit),
  pr_likes(id, user_id)
` as const;

function mapFeedRow(row: any, currentUserId: string): FeedPost {
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
  };
}

/**
 * Fetch the social feed: the most recent PRs from the current user and their
 * accepted friends, enriched with author profiles and like counts.
 */
export async function fetchFeed(
  currentUserId: string,
  participantIds: string[],
  limit = 50
): Promise<{ data: FeedPost[]; error: string | null }> {
  if (participantIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("personal_records")
    .select(FEED_SELECT)
    .in("user_id", participantIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };

  return {
    data: (data ?? []).map((row: any) => mapFeedRow(row, currentUserId)),
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

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Returns the existing conversation between two users, or creates a new one.
 * Always stores participant_a = LEAST(uid1, uid2) to guarantee uniqueness.
 * Handles the race condition where two clients create the same conversation
 * simultaneously by catching the unique-violation error and re-fetching.
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const a = userId1 < userId2 ? userId1 : userId2;
  const b = userId1 < userId2 ? userId2 : userId1;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();

  if (existing) return { conversationId: existing.id, error: null };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ participant_a: a, participant_b: b })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Race: another insert won — re-fetch
      const { data: raced } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_a", a)
        .eq("participant_b", b)
        .single();
      return { conversationId: raced?.id ?? null, error: null };
    }
    return { conversationId: null, error: error.message };
  }

  return { conversationId: created.id, error: null };
}

/**
 * Fetch all conversations for a user, ordered by most recent message.
 * Each row includes the other participant's profile and the last message preview.
 */
export async function fetchConversations(
  userId: string
): Promise<{ data: ConversationPreview[]; error: string | null }> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id, participant_a, participant_b, last_message_at, created_at,
      profile_a:profiles!conversations_participant_a_fkey(id, full_name, username, avatar_url, level),
      profile_b:profiles!conversations_participant_b_fkey(id, full_name, username, avatar_url, level),
      last_msg:messages!conversations_last_message_id_fkey(id, content, sender_id, read_at)
    `)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) return { data: [], error: error.message };

  const conversations: ConversationPreview[] = (data ?? []).map((row: any) => {
    const isA = row.participant_a === userId;
    const otherProfile = isA ? row.profile_b : row.profile_a;
    return {
      id: row.id,
      participant_a: row.participant_a,
      participant_b: row.participant_b,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
      other_user: {
        id: otherProfile?.id ?? "",
        full_name: otherProfile?.full_name ?? null,
        username: otherProfile?.username ?? null,
        avatar_url: otherProfile?.avatar_url ?? null,
        level: otherProfile?.level ?? 1,
      },
      last_message_content: row.last_msg?.content ?? null,
      last_message_sender_id: row.last_msg?.sender_id ?? null,
      last_message_read_at: row.last_msg?.read_at ?? null,
    };
  });

  return { data: conversations, error: null };
}

/**
 * Fetch messages for a conversation, newest-first from the DB but returned
 * oldest-first for display. Pass `beforeTimestamp` to page backwards.
 */
export async function fetchMessages(
  conversationId: string,
  limit = 50,
  beforeTimestamp?: string
): Promise<{ data: Message[]; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (beforeTimestamp) {
    query = query.lt("created_at", beforeTimestamp);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  // Reverse so oldest message is first (for display)
  return { data: ((data ?? []) as Message[]).reverse(), error: null };
}

/** Send a text message. Returns the inserted row so we can replace the optimistic copy. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ data: Message | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Message, error: null };
}

/**
 * Mark all unread messages from the other user as read in a conversation.
 * Called when the recipient opens or is already in the chat.
 */
export async function markMessagesRead(
  conversationId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);

  return { error: error?.message ?? null };
}

/** Upsert the current user's presence timestamp. Called on a 30-second heartbeat. */
export async function updatePresence(userId: string): Promise<void> {
  await supabase
    .from("user_presence")
    .upsert(
      { user_id: userId, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

/** Fetch presence rows for a list of user IDs. */
export async function fetchPresence(
  userIds: string[]
): Promise<{ data: UserPresence[]; error: string | null }> {
  if (userIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("user_presence")
    .select("user_id, last_seen_at")
    .in("user_id", userIds);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UserPresence[], error: null };
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
