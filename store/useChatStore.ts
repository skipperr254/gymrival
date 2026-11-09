import { create } from "zustand";
import {
  getOrCreateConversation,
  fetchConversations,
  fetchMessages,
  sendMessage as apiSendMessage,
  markMessagesRead,
  updatePresence,
  fetchPresence,
} from "@/lib/api";
import type { Message, ConversationPreview } from "@/types/social";
import { subscribeChat, subscribeInbox, teardownChatChannels } from "./chat/chatRealtime";

let _presenceHeartbeat: ReturnType<typeof setInterval> | null = null;
// Monotonic counter so two sendMessage() calls within the same millisecond
// (e.g. keyboard-submit + button-tap firing back to back) never produce the
// same optimistic temp id — a collision meant the second bubble got wiped
// out when the first real server row replaced "the" message matching that id.
let _sendMessageSeq = 0;

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** A user is "online" if they sent a heartbeat within the last 5 minutes. */
export function computeIsOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export interface ChatState {
  // ── Inbox ────────────────────────────────────────────────────────────────────
  conversations: ConversationPreview[];
  conversationsLoading: boolean;
  conversationsError: string | null;

  // ── Active chat ──────────────────────────────────────────────────────────────
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  activeConversationId: string | null;
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;

  // ── Presence ─────────────────────────────────────────────────────────────────
  /** userId → ISO last_seen_at string (or absent if never seen) */
  presenceMap: Record<string, string>;

  // ── Actions ──────────────────────────────────────────────────────────────────
  loadConversations: (userId: string) => Promise<void>;
  /**
   * Find or create a 1:1 conversation between currentUser and otherUser.
   * Returns the conversationId on success, or null on error.
   */
  getOrOpenChat: (currentUserId: string, otherUserId: string) => Promise<string | null>;

  loadMessages: (conversationId: string, userId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  /**
   * Optimistic send. On failure the bubble and the inbox preview are rolled
   * back and the result says why, so the screen can tell the user instead of
   * the message silently vanishing. `denied` = the server's Pro gate refused it.
   */
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string
  ) => Promise<{ ok: boolean; denied?: boolean }>;
  markRead: (conversationId: string, userId: string) => Promise<void>;

  /**
   * Subscribe to the inbox: fires on messages INSERT events so the conversation
   * list updates in real time when a new message arrives (from any conversation).
   * Returns an unsubscribe function for useEffect cleanup.
   */
  subscribeToInbox: (userId: string) => () => void;

  /**
   * Subscribe to a single conversation: fires on messages INSERT filtered
   * by conversationId. Call this when the chat screen mounts.
   * Returns an unsubscribe function for useEffect cleanup.
   */
  subscribeToChat: (conversationId: string, userId: string) => () => void;

  /**
   * Upsert presence immediately, then every 30 seconds.
   * Returns a cleanup function that stops the heartbeat.
   */
  startPresenceHeartbeat: (userId: string) => () => void;

  /** Fetch and cache presence for a list of user IDs. */
  fetchFriendsPresence: (userIds: string[]) => Promise<void>;

  /** Returns true if the given user is currently online. */
  isOnline: (userId: string) => boolean;

  /** Total number of conversations with unread messages from the other user. */
  unreadCount: (currentUserId: string) => number;

  /** Clears all state, stops the presence heartbeat, and tears down any active realtime channels. Call on sign-out. */
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,

  messages: [],
  messagesLoading: false,
  messagesError: null,
  activeConversationId: null,
  loadingOlderMessages: false,
  hasMoreMessages: true,

  presenceMap: {},

  // ─── Inbox ─────────────────────────────────────────────────────────────────

  loadConversations: async (userId) => {
    set({ conversationsLoading: true, conversationsError: null });
    const { data, error } = await fetchConversations(userId);
    if (!error) {
      set({ conversations: data });
      // Refresh presence for everyone in the inbox
      const otherIds = data.map((c) => c.other_user.id);
      if (otherIds.length > 0) get().fetchFriendsPresence(otherIds);
    }
    set({ conversationsLoading: false, conversationsError: error });
  },

  getOrOpenChat: async (currentUserId, otherUserId) => {
    const { conversationId, error } = await getOrCreateConversation(currentUserId, otherUserId);
    if (error || !conversationId) return null;
    return conversationId;
  },

  // ─── Messages ──────────────────────────────────────────────────────────────

  loadMessages: async (conversationId, userId) => {
    set({
      messagesLoading: true,
      messagesError: null,
      activeConversationId: conversationId,
      messages: [],
      hasMoreMessages: true,
    });
    const { data, error } = await fetchMessages(conversationId, 50);
    if (!error) {
      set({ messages: data, hasMoreMessages: data.length === 50 });
    }
    set({ messagesLoading: false, messagesError: error });
    if (error) return;
    // Mark all incoming messages as read upon opening
    get().markRead(conversationId, userId);
  },

  loadOlderMessages: async (conversationId) => {
    const { messages, loadingOlderMessages, hasMoreMessages } = get();
    if (loadingOlderMessages || !hasMoreMessages || messages.length === 0) return;

    set({ loadingOlderMessages: true });
    const oldestTimestamp = messages[0].created_at;
    const { data, error } = await fetchMessages(conversationId, 50, oldestTimestamp);
    if (!error) {
      set((s) => ({
        messages: [...data, ...s.messages],
        hasMoreMessages: data.length === 50,
      }));
    }
    set({ loadingOlderMessages: false });
  },

  sendMessage: async (conversationId, senderId, content) => {
    const trimmed = content.trim();
    if (!trimmed) return { ok: false };
    const previousConversations = get().conversations;

    // Optimistic: append to messages immediately
    _sendMessageSeq += 1;
    const tempId = `temp-${Date.now()}-${_sendMessageSeq}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed,
      message_type: "text",
      read_at: null,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ messages: [...s.messages, optimistic] }));

    // Optimistic: bubble conversation to top of inbox
    set((s) => ({
      conversations: s.conversations
        .map((c) =>
          c.id !== conversationId
            ? c
            : {
                ...c,
                last_message_content: trimmed,
                last_message_sender_id: senderId,
                last_message_at: optimistic.created_at,
                last_message_read_at: null,
              }
        )
        .sort((a, b) => {
          if (!a.last_message_at) return 1;
          if (!b.last_message_at) return -1;
          return b.last_message_at > a.last_message_at ? 1 : -1;
        }),
    }));

    const { data: sent, error, denied } = await apiSendMessage(conversationId, senderId, trimmed);

    if (error || !sent) {
      // Revert both optimistic writes: the bubble, and the inbox preview that
      // would otherwise keep showing a message that was never sent.
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== tempId),
        conversations: previousConversations,
      }));
      return { ok: false, denied };
    }

    // Replace temp with the real persisted row. Filters out (rather than
    // maps) both the temp id and the real id before re-adding `sent`: the
    // realtime subscription (see subscribeToChat) can deliver this same row
    // before this await resolves, in which case a plain map-replace would
    // leave two copies — the realtime-appended one and this one.
    set((s) => ({
      messages: [...s.messages.filter((m) => m.id !== tempId && m.id !== sent.id), sent].sort(
        (a, b) => (a.created_at > b.created_at ? 1 : -1)
      ),
    }));
    return { ok: true };
  },

  markRead: async (conversationId, userId) => {
    await markMessagesRead(conversationId, userId);
    // Reflect read state locally so the unread badge disappears instantly
    set((s) => ({
      messages: s.messages.map((m) =>
        m.conversation_id === conversationId &&
        m.sender_id !== userId &&
        !m.read_at
          ? { ...m, read_at: new Date().toISOString() }
          : m
      ),
      conversations: s.conversations.map((c) =>
        c.id === conversationId && c.last_message_sender_id !== userId
          ? { ...c, last_message_read_at: new Date().toISOString() }
          : c
      ),
    }));
  },

  // ─── Realtime ──────────────────────────────────────────────────────────────

  subscribeToInbox: (userId) => subscribeInbox(set, get, userId),

  subscribeToChat: (conversationId, userId) =>
    subscribeChat(set, get, conversationId, userId),

  // ─── Presence ──────────────────────────────────────────────────────────────

  startPresenceHeartbeat: (userId) => {
    // Fire immediately so the user appears online right away
    updatePresence(userId);

    if (_presenceHeartbeat) {
      clearInterval(_presenceHeartbeat);
    }
    _presenceHeartbeat = setInterval(() => {
      updatePresence(userId);
    }, 30_000);

    return () => {
      if (_presenceHeartbeat) {
        clearInterval(_presenceHeartbeat);
        _presenceHeartbeat = null;
      }
    };
  },

  fetchFriendsPresence: async (userIds) => {
    const { data } = await fetchPresence(userIds);
    const updates: Record<string, string> = {};
    for (const p of data) {
      updates[p.user_id] = p.last_seen_at;
    }
    set((s) => ({ presenceMap: { ...s.presenceMap, ...updates } }));
  },

  isOnline: (userId) => {
    const lastSeen = get().presenceMap[userId] ?? null;
    return computeIsOnline(lastSeen);
  },

  // ─── Derived ───────────────────────────────────────────────────────────────

  unreadCount: (currentUserId) =>
    get().conversations.filter(
      (c) =>
        c.last_message_sender_id !== null &&
        c.last_message_sender_id !== currentUserId &&
        c.last_message_read_at === null
    ).length,

  reset: () => {
    teardownChatChannels();
    if (_presenceHeartbeat) {
      clearInterval(_presenceHeartbeat);
      _presenceHeartbeat = null;
    }
    set({
      conversations: [],
      conversationsLoading: false,
      conversationsError: null,
      messages: [],
      messagesLoading: false,
      messagesError: null,
      activeConversationId: null,
      loadingOlderMessages: false,
      hasMoreMessages: true,
      presenceMap: {},
    });
  },
}));
