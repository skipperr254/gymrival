import { supabase } from "@/lib/supabase";
import type { FriendProfile, FriendRequest, FriendshipStatus, UserSearchResult } from "@/types/social";

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
