/**
 * Realtime state logic of the floating team chat (pure reducer + dock layout).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  floatingChatReducer,
  initialFloatingChatState,
  computeMaxOpenChats,
  mergeMessages,
  appendMessage,
  LAYOUT,
  type FloatingChatState,
  type FloatingChatAction,
} from "@/components/TeamChat/FloatingChatContext";
import {
  DOCK,
  DIALPAD_SLOT,
  dockSlotBottom,
  firstBubbleSlot,
  __resetDockForTests,
  setDialpadPresent,
  getDockState,
  announceDockPopoverOpened,
  onDockPopoverOpened,
} from "@/components/TeamChat/floatingDock";
import type { TeamChatMessage, TeamChatUser, TeamChatConversation } from "@/components/TeamChat/types";

const ME = 1;

const user = (id: number): TeamChatUser => ({
  id,
  email: `u${id}@x.test`,
  full_name: `User ${id}`,
  is_online: true,
});

let seq = 0;
const msg = (overrides: Partial<TeamChatMessage> = {}): TeamChatMessage => ({
  id: ++seq,
  conversation_id: 100,
  sender: user(2),
  message_type: "text",
  text: `m${seq}`,
  is_read: false,
  created_at: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
  ...overrides,
});

const conv = (id: number, other: number): TeamChatConversation => ({
  id,
  participants: [user(ME), user(other)],
  other_participant: user(other),
  last_message: null,
  unread_count: 0,
  created_at: "",
  updated_at: "",
});

const run = (state: FloatingChatState, ...actions: FloatingChatAction[]) =>
  actions.reduce(floatingChatReducer, state);

const open = (id: number): FloatingChatAction => ({ type: "OPEN_CHAT", payload: { user: user(id) } });

beforeEach(() => {
  seq = 0;
});

describe("own messages appear instantly (FE-RT-1)", () => {
  it("matches a message_sent echo to the window by recipient even when conversation is null", () => {
    let s = run(initialFloatingChatState, open(2));
    expect(s.openChats[0].conversation).toBeNull();

    const own = msg({ sender: user(ME), conversation_id: 555 });
    s = run(s, {
      type: "RECEIVE_MESSAGE",
      payload: { message: own, conversationId: 555, peerId: 2, currentUserId: ME },
    });
    expect(s.openChats[0].messages.map((m) => m.id)).toEqual([own.id]);
  });

  it("replaces the optimistic copy with the confirmed message (by client id)", () => {
    let s = run(initialFloatingChatState, open(2));
    const pending = msg({ id: -1, sender: user(ME), text: "hi", client_id: "c1", status: "pending" });
    s = run(s, { type: "ADD_MESSAGE", payload: { chatId: "chat_2", message: pending } });
    expect(s.openChats[0].messages).toHaveLength(1);

    const confirmed = msg({ sender: user(ME), text: "hi" });
    s = run(s, {
      type: "RECEIVE_MESSAGE",
      payload: { message: confirmed, conversationId: 100, peerId: 2, currentUserId: ME, clientId: "c1" },
    });
    expect(s.openChats[0].messages).toEqual([confirmed]);
  });

  it("marks and removes a failed optimistic message", () => {
    let s = run(initialFloatingChatState, open(2));
    const pending = msg({ id: -1, sender: user(ME), client_id: "c1", status: "pending" });
    s = run(s, { type: "ADD_MESSAGE", payload: { chatId: "chat_2", message: pending } });
    s = run(s, { type: "MARK_MESSAGE_FAILED", payload: { chatId: "chat_2", clientId: "c1" } });
    expect(s.openChats[0].messages[0].status).toBe("failed");
    s = run(s, { type: "REMOVE_MESSAGE", payload: { chatId: "chat_2", clientId: "c1" } });
    expect(s.openChats[0].messages).toEqual([]);
  });

  it("does not add a message to unrelated chats", () => {
    let s = run(initialFloatingChatState, open(2), open(3));
    s = run(s, {
      type: "RECEIVE_MESSAGE",
      payload: { message: msg({ sender: user(3) }), conversationId: 7, peerId: 3, currentUserId: ME },
    });
    expect(s.openChats.find((c) => c.id === "chat_2")!.messages).toHaveLength(0);
    expect(s.openChats.find((c) => c.id === "chat_3")!.messages).toHaveLength(1);
  });

  it("dedupes the same message delivered twice", () => {
    let s = run(initialFloatingChatState, open(2));
    const m = msg();
    const action: FloatingChatAction = {
      type: "RECEIVE_MESSAGE",
      payload: { message: m, conversationId: 100, peerId: 2, currentUserId: ME },
    };
    s = run(s, action, action);
    expect(s.openChats[0].messages).toHaveLength(1);
  });
});

describe("history snapshots merge instead of replace (FE-RT-4)", () => {
  it("keeps a WS message that arrived after the snapshot was taken", () => {
    let s = run(initialFloatingChatState, open(2));
    const old = msg();
    const live = msg();
    s = run(s, {
      type: "RECEIVE_MESSAGE",
      payload: { message: live, conversationId: 100, peerId: 2, currentUserId: ME },
    });
    s = run(s, { type: "UPDATE_MESSAGES", payload: { chatId: "chat_2", messages: [old] } });
    expect(s.openChats[0].messages.map((m) => m.id)).toEqual([old.id, live.id]);
    expect(s.openChats[0].lastMessage?.id).toBe(live.id);
  });

  it("loads history into a chat minimized before its fetch resolved", () => {
    let s = run(initialFloatingChatState, open(2), { type: "MINIMIZE_CHAT", payload: { chatId: "chat_2" } });
    const m = msg();
    s = run(
      s,
      { type: "UPDATE_MESSAGES", payload: { chatId: "chat_2", messages: [m] } },
      { type: "UPDATE_CONVERSATION", payload: { chatId: "chat_2", conversation: conv(100, 2) } }
    );
    expect(s.minimizedChats[0].messages).toEqual([m]);
    expect(s.minimizedChats[0].conversation?.id).toBe(100);
    s = run(s, { type: "MAXIMIZE_CHAT", payload: { chatId: "chat_2" } });
    expect(s.openChats[0].messages).toEqual([m]);
  });

  it("drops an optimistic message once the server copy shows up in a snapshot", () => {
    const pending = msg({ id: -1, sender: user(ME), text: "yo", client_id: "c9", status: "failed" });
    const server = msg({ sender: user(ME), text: "yo" });
    expect(mergeMessages([pending], [server])).toEqual([server]);
  });

  it("keeps an unrelated optimistic message at the end", () => {
    const known = msg();
    const pending = msg({ id: -1, sender: user(ME), text: "new", client_id: "c2", status: "pending" });
    expect(mergeMessages([known, pending], [known])).toEqual([known, pending]);
  });

  it("CLEAR_MESSAGES empties minimized chats too", () => {
    let s = run(initialFloatingChatState, open(2));
    s = run(s, { type: "ADD_MESSAGE", payload: { chatId: "chat_2", message: msg() } });
    s = run(s, { type: "MINIMIZE_CHAT", payload: { chatId: "chat_2" } });
    s = run(s, { type: "CLEAR_MESSAGES", payload: { chatId: "chat_2" } });
    expect(s.minimizedChats[0].messages).toEqual([]);
  });
});

describe("unread counting is computed from current state (FE-RT-9)", () => {
  it("counts every message of a burst on a minimized chat", () => {
    let s = run(initialFloatingChatState, open(2), { type: "MINIMIZE_CHAT", payload: { chatId: "chat_2" } });
    for (let i = 0; i < 3; i++) {
      s = run(s, {
        type: "RECEIVE_MESSAGE",
        payload: { message: msg(), conversationId: 100, peerId: 2, currentUserId: ME },
      });
    }
    expect(s.minimizedChats[0].unreadCount).toBe(3);
  });

  it("does not count own messages or open chats", () => {
    let s = run(initialFloatingChatState, open(2), open(3), { type: "MINIMIZE_CHAT", payload: { chatId: "chat_2" } });
    s = run(
      s,
      {
        type: "RECEIVE_MESSAGE",
        payload: { message: msg({ sender: user(ME) }), conversationId: 100, peerId: 2, currentUserId: ME },
      },
      {
        type: "RECEIVE_MESSAGE",
        payload: { message: msg({ sender: user(3) }), conversationId: 7, peerId: 3, currentUserId: ME },
      }
    );
    expect(s.minimizedChats[0].unreadCount).toBe(0);
    expect(s.openChats[0].unreadCount).toBe(0);
  });
});

describe("every chat is a window or a bubble (L2 / L4)", () => {
  it("moves the oldest window to a bubble when a 5th chat opens", () => {
    const s = run(initialFloatingChatState, open(2), open(3), open(4), open(5), open(6));
    expect(s.openChats.map((c) => c.user.id)).toEqual([3, 4, 5, 6]);
    expect(s.minimizedChats.map((c) => c.user.id)).toEqual([2]);
  });

  it("maximizing a bubble with all windows open minimizes the oldest window", () => {
    let s = run(initialFloatingChatState, open(2), { type: "MINIMIZE_CHAT", payload: { chatId: "chat_2" } });
    s = run(s, open(3), open(4), open(5), open(6));
    s = run(s, { type: "MAXIMIZE_CHAT", payload: { chatId: "chat_2" } });
    expect(s.openChats.map((c) => c.user.id)).toEqual([4, 5, 6, 2]);
    expect(s.minimizedChats.map((c) => c.user.id)).toEqual([3]);
  });

  it("caps the total at MAX_TOTAL_CHATS by dropping the oldest bubbles", () => {
    let s = initialFloatingChatState;
    for (let id = 2; id < 2 + LAYOUT.MAX_TOTAL_CHATS + 2; id++) s = run(s, open(id));
    expect(s.openChats.length + s.minimizedChats.length).toBe(LAYOUT.MAX_TOTAL_CHATS);
    expect(s.openChats).toHaveLength(LAYOUT.MAX_OPEN_CHATS);
    // the newest chat is visible
    expect(s.openChats[s.openChats.length - 1].user.id).toBe(2 + LAYOUT.MAX_TOTAL_CHATS + 1);
  });

  it("SET_MAX_OPEN minimizes overflow windows on a narrow viewport", () => {
    let s = run(initialFloatingChatState, open(2), open(3), open(4));
    s = run(s, { type: "SET_MAX_OPEN", payload: { maxOpen: 1 } });
    expect(s.openChats.map((c) => c.user.id)).toEqual([4]);
    expect(s.minimizedChats.map((c) => c.user.id)).toEqual([2, 3]);
    s = run(s, open(5));
    expect(s.openChats.map((c) => c.user.id)).toEqual([5]);
  });

  it("computes how many windows fit", () => {
    expect(computeMaxOpenChats(375)).toBe(1);
    expect(computeMaxOpenChats(700)).toBe(2);
    expect(computeMaxOpenChats(1920)).toBe(LAYOUT.MAX_OPEN_CHATS);
  });
});

describe("appendMessage", () => {
  it("returns the same array for a duplicate", () => {
    const m = msg();
    const list = [m];
    expect(appendMessage(list, m)).toBe(list);
  });
});

describe("dock layout (L1 / FE-UI-1 / L3 / L5)", () => {
  beforeEach(() => __resetDockForTests());

  it("never puts a minimized bubble on the dialpad launcher slot", () => {
    const dialpadBottom = dockSlotBottom(DIALPAD_SLOT);
    for (let i = 0; i < LAYOUT.MAX_TOTAL_CHATS; i++) {
      const bubbleBottom = dockSlotBottom(firstBubbleSlot(true) + i);
      expect(Math.abs(bubbleBottom - dialpadBottom)).toBeGreaterThanOrEqual(DOCK.SLOT_SIZE);
    }
    // without a dialpad the first bubble uses the slot right above the chat icon
    expect(dockSlotBottom(firstBubbleSlot(false))).toBe(54);
    expect(dockSlotBottom(firstBubbleSlot(true))).toBe(96);
  });

  it("stacks the dock below the modal layer (z-50) and bubbles above launchers", () => {
    const z = DOCK.Z_INDEX;
    expect(Math.max(z.launcher, z.bubble, z.window, z.popup)).toBeLessThan(50);
    expect(z.bubble).toBeGreaterThan(z.launcher);
  });

  it("publishes dialpad presence", () => {
    setDialpadPresent(true);
    expect(getDockState().dialpadPresent).toBe(true);
    setDialpadPresent(false);
    expect(getDockState().dialpadPresent).toBe(false);
  });

  it("notifies the other popover when one opens", () => {
    const seen: string[] = [];
    const off = onDockPopoverOpened((o) => seen.push(o));
    announceDockPopoverOpened("dialpad");
    announceDockPopoverOpened("chat-list");
    off();
    announceDockPopoverOpened("dialpad");
    expect(seen).toEqual(["dialpad", "chat-list"]);
  });
});

describe("read receipts flip own messages to read (BE-6)", () => {
  it("marks the listed messages read in the reader's window only", () => {
    let s = run(initialFloatingChatState, open(2), open(3));
    const a = msg({ sender: user(ME) });
    const b = msg({ sender: user(ME) });
    s = run(
      s,
      { type: "ADD_MESSAGE", payload: { chatId: "chat_2", message: a } },
      { type: "ADD_MESSAGE", payload: { chatId: "chat_2", message: b } },
      { type: "ADD_MESSAGE", payload: { chatId: "chat_3", message: { ...a } } }
    );
    s = run(s, { type: "MESSAGES_READ", payload: { messageIds: [a.id], conversationId: null, readBy: 2 } });
    const chat2 = s.openChats.find((c) => c.id === "chat_2")!;
    const chat3 = s.openChats.find((c) => c.id === "chat_3")!;
    expect(chat2.messages.map((m) => m.is_read)).toEqual([true, false]);
    expect(chat3.messages[0].is_read).toBe(false);
  });

  it("returns the same state when nothing changes", () => {
    const s = run(initialFloatingChatState, open(2));
    expect(floatingChatReducer(s, { type: "MESSAGES_READ", payload: { messageIds: [99], readBy: 2 } })).toBe(s);
  });
});

describe("call-rail width reservation (L3 / L4)", () => {
  it("fits fewer windows while the call rail takes space at the right edge", () => {
    const shift = DOCK.CALL_RAIL_WIDTH;
    expect(computeMaxOpenChats(1280)).toBe(4);
    expect(computeMaxOpenChats(1280, shift)).toBe(3);
    expect(computeMaxOpenChats(1100, shift)).toBe(2);
    expect(computeMaxOpenChats(500, shift)).toBe(1);
  });
});
