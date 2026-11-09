/**
 * Behaviour tests for useChatStore: inbox, messages, presence and their
 * realtime subscriptions. They pin the store's public shape and the
 * optimistic-send logic: a sent message must appear exactly once, whether the
 * server response or the realtime echo arrives first, and a message from the
 * same account on a second device must not be dropped.
 */

type Handler = (payload: Record<string, unknown>) => unknown;
const mockChannels: { name: string; handlers: Handler[] }[] = [];

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn((name: string) => {
      const entry = { name, handlers: [] as Handler[] };
      mockChannels.push(entry);
      const ch = {
        on: (_t: string, _cfg: unknown, handler: Handler) => {
          entry.handlers.push(handler);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/lib/api", () => ({
  getOrCreateConversation: jest.fn(),
  fetchConversations: jest.fn(),
  fetchMessages: jest.fn(),
  sendMessage: jest.fn(),
  markMessagesRead: jest.fn(),
  updatePresence: jest.fn(),
  fetchPresence: jest.fn(),
}));

import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useChatStore, computeIsOnline } from "@/store/useChatStore";
import type { ConversationPreview, Message } from "@/types/social";

const mocked = api as jest.Mocked<typeof api>;
const ME = "me";

function msg(id: string, over: Partial<Message> = {}): Message {
  return {
    id,
    conversation_id: "c1",
    sender_id: "other",
    content: id,
    message_type: "text",
    read_at: null,
    created_at: `2026-01-01T00:00:${id.padStart(2, "0")}Z`,
    ...over,
  } as Message;
}

function conv(id: string, at: string | null, over: Partial<ConversationPreview> = {}): ConversationPreview {
  return {
    id,
    other_user: { id: `u-${id}` },
    last_message_content: null,
    last_message_sender_id: null,
    last_message_at: at,
    last_message_read_at: null,
    ...over,
  } as ConversationPreview;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChannels.length = 0;
  useChatStore.getState().reset();
  mocked.markMessagesRead.mockResolvedValue(undefined as never);
});

describe("public shape", () => {
  it("exposes the same state keys, initial values and actions", () => {
    const s = useChatStore.getState();
    const values: Record<string, unknown> = {};
    const actions: string[] = [];
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === "function") actions.push(k);
      else values[k] = v;
    }
    expect(values).toEqual({
      conversations: [], conversationsLoading: false, conversationsError: null,
      messages: [], messagesLoading: false, messagesError: null, activeConversationId: null,
      loadingOlderMessages: false, hasMoreMessages: true, presenceMap: {},
    });
    expect(actions.sort()).toEqual(
      [
        "loadConversations", "getOrOpenChat", "loadMessages", "loadOlderMessages",
        "sendMessage", "markRead", "subscribeToInbox", "subscribeToChat",
        "startPresenceHeartbeat", "fetchFriendsPresence", "isOnline", "unreadCount", "reset",
      ].sort()
    );
  });
});

describe("messages", () => {
  it("loadMessages loads a page, then marks the conversation read", async () => {
    mocked.fetchMessages.mockResolvedValueOnce({ data: [msg("1")], error: null } as never);
    await useChatStore.getState().loadMessages("c1", ME);
    const s = useChatStore.getState();
    expect(s.activeConversationId).toBe("c1");
    expect(s.messages.map((m) => m.id)).toEqual(["1"]);
    expect(s.hasMoreMessages).toBe(false);
    expect(mocked.markMessagesRead).toHaveBeenCalledWith("c1", ME);
  });

  it("loadMessages does not mark read when the fetch fails", async () => {
    mocked.fetchMessages.mockResolvedValueOnce({ data: [], error: "net" } as never);
    await useChatStore.getState().loadMessages("c1", ME);
    expect(useChatStore.getState().messagesError).toBe("net");
    expect(mocked.markMessagesRead).not.toHaveBeenCalled();
  });

  it("loadOlderMessages prepends the page before the oldest message", async () => {
    useChatStore.setState({ messages: [msg("5")], hasMoreMessages: true });
    mocked.fetchMessages.mockResolvedValueOnce({ data: [msg("1"), msg("2")], error: null } as never);
    await useChatStore.getState().loadOlderMessages("c1");
    expect(mocked.fetchMessages).toHaveBeenCalledWith("c1", 50, msg("5").created_at);
    expect(useChatStore.getState().messages.map((m) => m.id)).toEqual(["1", "2", "5"]);
  });

  it("sendMessage shows the message at once, bubbles the conversation, then swaps in the server row", async () => {
    useChatStore.setState({ conversations: [conv("c0", "2026-01-02"), conv("c1", "2026-01-01")] });
    const server = deferred<unknown>();
    mocked.sendMessage.mockReturnValueOnce(server.promise as never);

    const sending = useChatStore.getState().sendMessage("c1", ME, "  hi  ");
    const mid = useChatStore.getState();
    expect(mid.messages).toHaveLength(1);
    expect(mid.messages[0]).toMatchObject({ content: "hi", sender_id: ME });
    expect(mid.messages[0].id.startsWith("temp-")).toBe(true);
    expect(mid.conversations.map((c) => c.id)).toEqual(["c1", "c0"]);

    server.resolve({ data: msg("real", { sender_id: ME, content: "hi" }), error: null });
    await sending;
    expect(useChatStore.getState().messages.map((m) => m.id)).toEqual(["real"]);
  });

  it("a send whose realtime echo arrives first still appears exactly once", async () => {
    useChatStore.getState().subscribeToChat("c1", ME);
    const onMsg = mockChannels[0].handlers[0];
    const server = deferred<unknown>();
    mocked.sendMessage.mockReturnValueOnce(server.promise as never);

    const sending = useChatStore.getState().sendMessage("c1", ME, "hi");
    const real = msg("real", { sender_id: ME, content: "hi" });
    onMsg({ new: real });
    server.resolve({ data: real, error: null });
    await sending;
    expect(useChatStore.getState().messages.map((m) => m.id)).toEqual(["real"]);
  });

  it("sendMessage removes the optimistic message when the send fails", async () => {
    mocked.sendMessage.mockResolvedValueOnce({ data: null, error: "boom" } as never);
    await useChatStore.getState().sendMessage("c1", ME, "hi");
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("two sends in the same millisecond get distinct temp ids", () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1000);
    mocked.sendMessage.mockReturnValue(new Promise(() => {}) as never);
    useChatStore.getState().sendMessage("c1", ME, "a");
    useChatStore.getState().sendMessage("c1", ME, "b");
    const ids = useChatStore.getState().messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
    now.mockRestore();
  });

  it("ignores a blank message", async () => {
    await useChatStore.getState().sendMessage("c1", ME, "   ");
    expect(mocked.sendMessage).not.toHaveBeenCalled();
  });
});

describe("unread", () => {
  it("markRead clears unread on incoming messages and the conversation", async () => {
    useChatStore.setState({
      messages: [msg("1"), msg("2", { sender_id: ME })],
      conversations: [conv("c1", "t", { last_message_sender_id: "other" })],
    });
    expect(useChatStore.getState().unreadCount(ME)).toBe(1);
    await useChatStore.getState().markRead("c1", ME);
    const s = useChatStore.getState();
    expect(s.messages[0].read_at).not.toBeNull();
    expect(s.messages[1].read_at).toBeNull();
    expect(s.unreadCount(ME)).toBe(0);
  });
});

describe("inbox realtime", () => {
  it("reloads the inbox for a brand-new conversation", () => {
    mocked.fetchConversations.mockResolvedValue({ data: [], error: null } as never);
    useChatStore.getState().subscribeToInbox(ME);
    mockChannels[0].handlers[0]({ new: msg("1", { conversation_id: "new" }) });
    expect(mocked.fetchConversations).toHaveBeenCalledWith(ME);
  });

  it("bubbles a conversation and marks it unread on an incoming message, ignoring own sends", () => {
    useChatStore.setState({ conversations: [conv("c0", "2026-01-02"), conv("c1", "2026-01-01")] });
    useChatStore.getState().subscribeToInbox(ME);
    const onMsg = mockChannels[0].handlers[0];

    onMsg({ new: msg("1", { sender_id: ME, created_at: "2026-02-01" }) });
    expect(useChatStore.getState().conversations.map((c) => c.id)).toEqual(["c0", "c1"]);

    onMsg({ new: msg("2", { created_at: "2026-02-01", content: "yo" }) });
    const s = useChatStore.getState();
    expect(s.conversations.map((c) => c.id)).toEqual(["c1", "c0"]);
    expect(s.conversations[0]).toMatchObject({ last_message_content: "yo", last_message_read_at: null });
  });
});

describe("chat realtime", () => {
  it("appends a message from the same account on another device", () => {
    useChatStore.getState().subscribeToChat("c1", ME);
    mockChannels[0].handlers[0]({ new: msg("1", { sender_id: ME }) });
    expect(useChatStore.getState().messages.map((m) => m.id)).toEqual(["1"]);
    expect(mocked.markMessagesRead).not.toHaveBeenCalled();
  });

  it("marks the other participant's message read, and drops a duplicate delivery", () => {
    useChatStore.getState().subscribeToChat("c1", ME);
    const onMsg = mockChannels[0].handlers[0];
    onMsg({ new: msg("1") });
    onMsg({ new: msg("1") });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(mocked.markMessagesRead).toHaveBeenCalledWith("c1", ME);
  });
});

describe("presence", () => {
  it("computeIsOnline uses a 5-minute window", () => {
    expect(computeIsOnline(null)).toBe(false);
    expect(computeIsOnline(new Date(Date.now() - 60_000).toISOString())).toBe(true);
    expect(computeIsOnline(new Date(Date.now() - 6 * 60_000).toISOString())).toBe(false);
  });

  it("fetchFriendsPresence feeds isOnline", async () => {
    mocked.fetchPresence.mockResolvedValueOnce({
      data: [{ user_id: "a", last_seen_at: new Date().toISOString() }],
    } as never);
    await useChatStore.getState().fetchFriendsPresence(["a"]);
    expect(useChatStore.getState().isOnline("a")).toBe(true);
    expect(useChatStore.getState().isOnline("b")).toBe(false);
  });

  it("the heartbeat fires immediately and every 30s until stopped; reset stops it too", () => {
    jest.useFakeTimers();
    const stop = useChatStore.getState().startPresenceHeartbeat(ME);
    expect(mocked.updatePresence).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    expect(mocked.updatePresence).toHaveBeenCalledTimes(3);
    stop();
    jest.advanceTimersByTime(60_000);
    expect(mocked.updatePresence).toHaveBeenCalledTimes(3);

    useChatStore.getState().startPresenceHeartbeat(ME);
    useChatStore.getState().reset();
    jest.advanceTimersByTime(60_000);
    expect(mocked.updatePresence).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });
});

describe("cleanup", () => {
  it("a stale cleanup doesn't tear down a newer chat channel; reset removes both", () => {
    const old = useChatStore.getState().subscribeToChat("c1", ME);
    useChatStore.getState().subscribeToChat("c2", ME);
    useChatStore.getState().subscribeToInbox(ME);
    (supabase.removeChannel as jest.Mock).mockClear();
    old();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    useChatStore.getState().reset();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(3);
  });
});
