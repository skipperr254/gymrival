import { create } from "zustand";
import { supabase } from "@/lib/supabase";
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

// Module-level channel refs — never double-subscribe across StrictMode remounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _inboxChannel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chatChannel: any = null;
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

interface ChatState {
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
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
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
    if (!trimmed) return;

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

    const { data: sent, error } = await apiSendMessage(conversationId, senderId, trimmed);

    if (error || !sent) {
      // Revert optimistic message on failure
      set((s) => ({ messages: s.messages.filter((m) => m.id !== tempId) }));
      return;
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

  subscribeToInbox: (userId) => {
    if (_inboxChannel) {
      supabase.removeChannel(_inboxChannel);
      _inboxChannel = null;
    }

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;

          const conv = get().conversations.find((c) => c.id === msg.conversation_id);

          if (!conv) {
            // First message in a brand-new conversation — reload the full inbox
            // so we also get the other participant's profile data.
            get().loadConversations(userId);
            return;
          }

          // Don't double-count our own sends (optimistic update already handled it)
          if (msg.sender_id === userId) return;

          set((s) => ({
            conversations: s.conversations
              .map((c) =>
                c.id !== msg.conversation_id
                  ? c
                  : {
                      ...c,
                      last_message_content: msg.content,
                      last_message_sender_id: msg.sender_id,
                      last_message_at: msg.created_at,
                      // null = unread (recipient hasn't opened the chat yet)
                      last_message_read_at: null,
                    }
              )
              .sort((a, b) => {
                if (!a.last_message_at) return 1;
                if (!b.last_message_at) return -1;
                return b.last_message_at > a.last_message_at ? 1 : -1;
              }),
          }));
        }
      )
      .subscribe();

    _inboxChannel = channel;

    return () => {
      // Owner-aware cleanup: only clear the module ref if it still points at
      // the channel THIS subscriber created. A stale cleanup (e.g. a popped
      // screen unmounting after the feed screen re-subscribed on focus) must
      // not kill the newer subscriber's channel.
      supabase.removeChannel(channel);
      if (_inboxChannel === channel) _inboxChannel = null;
    };
  },

  subscribeToChat: (conversationId, userId) => {
    if (_chatChannel) {
      supabase.removeChannel(_chatChannel);
      _chatChannel = null;
    }

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;

          // Dedup by real id instead of blanket-skipping every event whose
          // sender is "me": the same account signed in on a second device
          // has sender_id === userId too, and that message is never our own
          // already-applied optimistic echo — skipping it just silently
          // dropped it. A message genuinely already present locally (our
          // own optimistic send, already replaced by sendMessage's response,
          // or a duplicate delivery) is caught by the id check instead.
          set((s) => {
            const exists = s.messages.some((m) => m.id === msg.id);
            if (exists) return s;
            return {
              messages: [...s.messages, msg].sort((a, b) =>
                a.created_at > b.created_at ? 1 : -1
              ),
            };
          });

          // Only auto-mark-read for messages actually sent by the other
          // participant — marking our own send as "read" is meaningless.
          if (msg.sender_id !== userId) {
            get().markRead(conversationId, userId);
          }
        }
      )
      .subscribe();

    _chatChannel = channel;

    return () => {
      // Owner-aware cleanup, matching subscribeToInbox/subscribeToFeedEvents/
      // subscribeToFriendEvents: only clear the module ref if it still points
      // at the channel THIS subscriber created. Without this, an older chat
      // screen's cleanup (e.g. React Navigation keeps pushed screens mounted
      // underneath newer ones) could remove a newer chat screen's active
      // channel and silently kill its live message delivery.
      supabase.removeChannel(channel);
      if (_chatChannel === channel) _chatChannel = null;
    };
  },

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
    if (_inboxChannel) {
      supabase.removeChannel(_inboxChannel);
      _inboxChannel = null;
    }
    if (_chatChannel) {
      supabase.removeChannel(_chatChannel);
      _chatChannel = null;
    }
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
