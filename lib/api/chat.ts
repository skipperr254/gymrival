import { supabase } from "@/lib/supabase";
import type { Message, ConversationPreview, UserPresence } from "@/types/social";

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
