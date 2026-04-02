/**
 * Tests for ChatReducer — pure reducer function.
 * No mocks needed except crypto.randomUUID for stable IDs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatReducer } from "@/components/chat/reducers/chat-reducer";
import type {
  ChatStateType,
  ChatType,
  MessageType,
} from "@/components/chat/types";

// Stable UUID mock
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `uuid-${++uuidCounter}`,
});

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<MessageType> = {}): MessageType {
  return {
    id: "msg-1",
    senderId: "sender_1",
    text: "Hello",
    status: "SENT",
    createdAt: new Date("2024-06-01T10:00:00Z"),
    ...overrides,
  };
}

function makeChat(overrides: Partial<ChatType> = {}): ChatType {
  return {
    id: "chat-1",
    name: "John Doe",
    lastMessage: { content: "Hello", createdAt: new Date("2024-06-01T10:00:00Z") },
    messages: [],
    users: [],
    typingUsers: [],
    unreadCount: 0,
    platform: "facebook",
    ...overrides,
  };
}

function makeState(overrides: Partial<ChatStateType> = {}): ChatStateType {
  return {
    chats: [],
    selectedChat: null,
    ...overrides,
  };
}

describe("ChatReducer", () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  // -----------------------------------------------------------------------
  // addTextMessage
  // -----------------------------------------------------------------------
  describe("addTextMessage", () => {
    it("adds a text message to the selected chat", () => {
      const chat = makeChat({ id: "c1", messages: [] });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, { type: "addTextMessage", text: "Hi" });

      const updated = result.chats.find((c) => c.id === "c1")!;
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].text).toBe("Hi");
      expect(updated.messages[0].id).toBe("uuid-1");
      expect(updated.messages[0].senderId).toBe("1");
      expect(updated.messages[0].status).toBe("DELIVERED");
    });

    it("updates lastMessage content and timestamp", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, { type: "addTextMessage", text: "Updated" });

      expect(result.chats[0].lastMessage.content).toBe("Updated");
    });

    it("returns same state when no selectedChat", () => {
      const state = makeState({ chats: [makeChat()], selectedChat: null });

      const result = ChatReducer(state, { type: "addTextMessage", text: "Nope" });

      expect(result).toBe(state);
    });

    it("does not modify other chats", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2", name: "Jane" });
      const state = makeState({ chats: [chat1, chat2], selectedChat: chat1 });

      const result = ChatReducer(state, { type: "addTextMessage", text: "Only c1" });

      expect(result.chats[1].messages).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // addImagesMessage
  // -----------------------------------------------------------------------
  describe("addImagesMessage", () => {
    it("adds an images message to the selected chat", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });
      const images = [
        { name: "photo.jpg", url: "/photo.jpg", size: 1024 },
      ];

      const result = ChatReducer(state, { type: "addImagesMessage", images });

      const updated = result.chats[0];
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].images).toEqual(images);
    });

    it("sets lastMessage to 'Image' for single image", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, {
        type: "addImagesMessage",
        images: [{ name: "a.jpg", url: "/a.jpg", size: 0 }],
      });

      expect(result.chats[0].lastMessage.content).toBe("Image");
    });

    it("sets lastMessage to 'Images' for multiple images", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, {
        type: "addImagesMessage",
        images: [
          { name: "a.jpg", url: "/a.jpg", size: 0 },
          { name: "b.jpg", url: "/b.jpg", size: 0 },
        ],
      });

      expect(result.chats[0].lastMessage.content).toBe("Images");
    });

    it("returns same state when no selectedChat", () => {
      const state = makeState({ selectedChat: null });
      const result = ChatReducer(state, {
        type: "addImagesMessage",
        images: [{ name: "x.jpg", url: "/x.jpg", size: 0 }],
      });
      expect(result).toBe(state);
    });
  });

  // -----------------------------------------------------------------------
  // addFilesMessage
  // -----------------------------------------------------------------------
  describe("addFilesMessage", () => {
    it("adds a files message to the selected chat", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });
      const files = [{ name: "doc.pdf", url: "/doc.pdf", size: 2048 }];

      const result = ChatReducer(state, { type: "addFilesMessage", files });

      expect(result.chats[0].messages).toHaveLength(1);
      expect(result.chats[0].messages[0].files).toEqual(files);
    });

    it("sets lastMessage to 'File' for single file", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, {
        type: "addFilesMessage",
        files: [{ name: "doc.pdf", url: "/doc.pdf", size: 0 }],
      });

      expect(result.chats[0].lastMessage.content).toBe("File");
    });

    it("sets lastMessage to 'Files' for multiple files", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, {
        type: "addFilesMessage",
        files: [
          { name: "a.pdf", url: "/a.pdf", size: 0 },
          { name: "b.pdf", url: "/b.pdf", size: 0 },
        ],
      });

      expect(result.chats[0].lastMessage.content).toBe("Files");
    });

    it("returns same state when no selectedChat", () => {
      const state = makeState({ selectedChat: null });
      const result = ChatReducer(state, {
        type: "addFilesMessage",
        files: [{ name: "x.pdf", url: "/x.pdf", size: 0 }],
      });
      expect(result).toBe(state);
    });
  });

  // -----------------------------------------------------------------------
  // setUnreadCount
  // -----------------------------------------------------------------------
  describe("setUnreadCount", () => {
    it("resets unread count to 0 for the selected chat", () => {
      const chat = makeChat({ id: "c1", unreadCount: 5 });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, { type: "setUnreadCount" });

      expect(result.chats[0].unreadCount).toBe(0);
    });

    it("returns same state when no selectedChat", () => {
      const state = makeState({ selectedChat: null });
      const result = ChatReducer(state, { type: "setUnreadCount" });
      expect(result).toBe(state);
    });
  });

  // -----------------------------------------------------------------------
  // selectChat
  // -----------------------------------------------------------------------
  describe("selectChat", () => {
    it("sets the selected chat", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat] });

      const result = ChatReducer(state, { type: "selectChat", chat });

      expect(result.selectedChat).toBe(chat);
    });

    it("replaces previously selected chat", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2" });
      const state = makeState({ chats: [chat1, chat2], selectedChat: chat1 });

      const result = ChatReducer(state, { type: "selectChat", chat: chat2 });

      expect(result.selectedChat?.id).toBe("c2");
    });
  });

  // -----------------------------------------------------------------------
  // updateChats
  // -----------------------------------------------------------------------
  describe("updateChats", () => {
    it("replaces chats list", () => {
      const state = makeState({ chats: [makeChat({ id: "old" })] });
      const newChats = [makeChat({ id: "new" })];

      const result = ChatReducer(state, { type: "updateChats", chats: newChats });

      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].id).toBe("new");
    });

    it("preserves loaded messages from existing chats", () => {
      const existingChat = makeChat({
        id: "c1",
        messages: [makeMessage()],
        messagesLoaded: true,
      });
      const state = makeState({ chats: [existingChat] });
      const newChat = makeChat({ id: "c1", messages: [] });

      const result = ChatReducer(state, { type: "updateChats", chats: [newChat] });

      expect(result.chats[0].messages).toHaveLength(1);
      expect(result.chats[0].messagesLoaded).toBe(true);
    });

    it("does not preserve messages if not previously loaded", () => {
      const existingChat = makeChat({ id: "c1", messages: [], messagesLoaded: false });
      const state = makeState({ chats: [existingChat] });
      const newChat = makeChat({ id: "c1", messages: [] });

      const result = ChatReducer(state, { type: "updateChats", chats: [newChat] });

      expect(result.chats[0].messagesLoaded).toBeUndefined();
    });

    it("preserves selectedChat if it still exists", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });
      const updatedChat = makeChat({ id: "c1", name: "Updated Name" });

      const result = ChatReducer(state, { type: "updateChats", chats: [updatedChat] });

      expect(result.selectedChat?.id).toBe("c1");
      expect(result.selectedChat?.name).toBe("Updated Name");
    });

    it("clears selectedChat if it no longer exists", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, { type: "updateChats", chats: [makeChat({ id: "c2" })] });

      expect(result.selectedChat).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // updateChatMessages
  // -----------------------------------------------------------------------
  describe("updateChatMessages", () => {
    it("sets messages for a specific chat", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat] });
      const messages = [makeMessage({ id: "m1" }), makeMessage({ id: "m2" })];

      const result = ChatReducer(state, {
        type: "updateChatMessages",
        chatId: "c1",
        messages,
      });

      expect(result.chats[0].messages).toHaveLength(2);
      expect(result.chats[0].messagesLoaded).toBe(true);
    });

    it("updates selectedChat if it matches", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });
      const messages = [makeMessage({ id: "m1" })];

      const result = ChatReducer(state, {
        type: "updateChatMessages",
        chatId: "c1",
        messages,
      });

      expect(result.selectedChat?.messages).toHaveLength(1);
      expect(result.selectedChat?.messagesLoaded).toBe(true);
    });

    it("does not update selectedChat if chatId differs", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2" });
      const state = makeState({ chats: [chat1, chat2], selectedChat: chat1 });

      const result = ChatReducer(state, {
        type: "updateChatMessages",
        chatId: "c2",
        messages: [makeMessage()],
      });

      expect(result.selectedChat?.messages).toHaveLength(0);
    });

    it("does not modify other chats", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2", messages: [makeMessage()] });
      const state = makeState({ chats: [chat1, chat2] });

      const result = ChatReducer(state, {
        type: "updateChatMessages",
        chatId: "c1",
        messages: [makeMessage({ id: "new" })],
      });

      expect(result.chats[1].messages).toHaveLength(1);
      expect(result.chats[1].messages[0].id).toBe("msg-1");
    });
  });

  // -----------------------------------------------------------------------
  // addIncomingMessage
  // -----------------------------------------------------------------------
  describe("addIncomingMessage", () => {
    it("adds message to existing chat", () => {
      const chat = makeChat({ id: "c1", messages: [makeMessage()] });
      const state = makeState({ chats: [chat] });
      const newMsg = makeMessage({ id: "m2", text: "Incoming" });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c1",
        message: newMsg,
      });

      expect(result.chats[0].messages).toHaveLength(2);
      expect(result.chats[0].messages[1].text).toBe("Incoming");
    });

    it("updates lastMessage on incoming", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat] });
      const msg = makeMessage({ text: "New last msg" });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c1",
        message: msg,
      });

      expect(result.chats[0].lastMessage.content).toBe("New last msg");
    });

    it("increments unreadCount when chat is NOT selected", () => {
      const chat = makeChat({ id: "c1", unreadCount: 2 });
      const state = makeState({ chats: [chat], selectedChat: null });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c1",
        message: makeMessage(),
      });

      expect(result.chats[0].unreadCount).toBe(3);
    });

    it("does NOT increment unreadCount when chat IS selected", () => {
      const chat = makeChat({ id: "c1", unreadCount: 2 });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c1",
        message: makeMessage(),
      });

      expect(result.chats[0].unreadCount).toBe(2);
    });

    it("moves the chat to the top of the list", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2" });
      const state = makeState({ chats: [chat1, chat2] });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c2",
        message: makeMessage(),
      });

      expect(result.chats[0].id).toBe("c2");
      expect(result.chats[1].id).toBe("c1");
    });

    it("creates new chat if chatId is not found", () => {
      const state = makeState({ chats: [] });
      const msg = makeMessage({ text: "New conv", platform: "whatsapp" });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "new-chat",
        message: msg,
        senderName: "Alice",
      });

      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].id).toBe("new-chat");
      expect(result.chats[0].name).toBe("Alice");
      expect(result.chats[0].unreadCount).toBe(1);
      expect(result.chats[0].platform).toBe("whatsapp");
    });

    it("updates selectedChat when it matches", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });
      const msg = makeMessage({ text: "For selected" });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c1",
        message: msg,
      });

      expect(result.selectedChat?.messages).toHaveLength(1);
      expect(result.selectedChat?.lastMessage.content).toBe("For selected");
    });

    it("does not update selectedChat when chatId differs", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2" });
      const state = makeState({ chats: [chat1, chat2], selectedChat: chat1 });

      const result = ChatReducer(state, {
        type: "addIncomingMessage",
        chatId: "c2",
        message: makeMessage(),
      });

      expect(result.selectedChat?.id).toBe("c1");
      expect(result.selectedChat?.messages).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // removeChat
  // -----------------------------------------------------------------------
  describe("removeChat", () => {
    it("removes chat by ID", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat] });

      const result = ChatReducer(state, { type: "removeChat", chatId: "c1" });

      expect(result.chats).toHaveLength(0);
    });

    it("clears selectedChat if removed", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat], selectedChat: chat });

      const result = ChatReducer(state, { type: "removeChat", chatId: "c1" });

      expect(result.selectedChat).toBeNull();
    });

    it("preserves selectedChat if different chat removed", () => {
      const chat1 = makeChat({ id: "c1" });
      const chat2 = makeChat({ id: "c2" });
      const state = makeState({ chats: [chat1, chat2], selectedChat: chat1 });

      const result = ChatReducer(state, { type: "removeChat", chatId: "c2" });

      expect(result.selectedChat?.id).toBe("c1");
      expect(result.chats).toHaveLength(1);
    });

    it("no-op for unknown chatId", () => {
      const chat = makeChat({ id: "c1" });
      const state = makeState({ chats: [chat] });

      const result = ChatReducer(state, { type: "removeChat", chatId: "unknown" });

      expect(result.chats).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Unknown action
  // -----------------------------------------------------------------------
  describe("unknown action", () => {
    it("returns current state", () => {
      const state = makeState({ chats: [makeChat()] });

      const result = ChatReducer(state, { type: "nonExistent" } as any);

      expect(result).toBe(state);
    });
  });
});
