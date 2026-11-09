import type { StoreApi } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/types/social";
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatState } from "../useChatStore";

// Module-level channel refs — never double-subscribe across StrictMode remounts
let _inboxChannel: RealtimeChannel | null = null;
let _chatChannel: RealtimeChannel | null = null;

type SetState = StoreApi<ChatState>["setState"];
type GetState = StoreApi<ChatState>["getState"];

/** Removes the inbox and chat channels, if open. Used by reset(). */
export function teardownChatChannels() {
  if (_inboxChannel) {
    supabase.removeChannel(_inboxChannel);
    _inboxChannel = null;
  }
  if (_chatChannel) {
    supabase.removeChannel(_chatChannel);
    _chatChannel = null;
  }
}

/** Live inbox: re-sorts conversations as messages arrive. Returns an unsubscribe function. */
export function subscribeInbox(set: SetState, get: GetState, userId: string): () => void {
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
}

/** Live messages for one conversation. Returns an unsubscribe function. */
export function subscribeChat(set: SetState, get: GetState, conversationId: string, userId: string): () => void {
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
}
