/**
 * Tests for useTeamChatApi hooks.
 * Frontend counterpart of backend test_team_chat_views.py:
 *   - useTeamChatUsers query
 *   - useTeamChatConversations query
 *   - useTeamChatConversation (single, disabled when null)
 *   - useTeamChatConversationWithUser (disabled when null)
 *   - useTeamChatUnreadCount query
 *   - Mutations: useSendTeamChatMessage, useMarkConversationRead,
 *     useClearChatHistory, useHideChatForMe
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockAxiosGet, mockAxiosPost, mockAxiosDelete } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
  mockAxiosPost: vi.fn(),
  mockAxiosDelete: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
    delete: mockAxiosDelete,
  },
}));

vi.mock("@/api/generated", () => ({
  teamChatConversationsHideForMeCreate: vi.fn(),
}));

import {
  useTeamChatUsers,
  useTeamChatConversations,
  useTeamChatConversation,
  useTeamChatConversationWithUser,
  useTeamChatUnreadCount,
  useSendTeamChatMessage,
  useMarkConversationRead,
  useClearChatHistory,
  useHideChatForMe,
  teamChatKeys,
} from "@/components/TeamChat/useTeamChatApi";
import { teamChatConversationsHideForMeCreate } from "@/api/generated";

const mockHideForMe = vi.mocked(teamChatConversationsHideForMeCreate);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_USER = {
  id: 1,
  email: "alice@test.com",
  first_name: "Alice",
  last_name: "Smith",
  full_name: "Alice Smith",
  is_online: true,
  last_seen: "2024-01-01T12:00:00Z",
};

const MOCK_USER_2 = {
  id: 2,
  email: "bob@test.com",
  first_name: "Bob",
  last_name: "Jones",
  full_name: "Bob Jones",
  is_online: false,
  last_seen: "2024-01-01T10:00:00Z",
};

const MOCK_MESSAGE = {
  id: 1,
  conversation_id: 1,
  sender: MOCK_USER,
  message_type: "text",
  text: "Hello!",
  is_read: false,
  created_at: "2024-01-01T12:00:00Z",
};

const MOCK_CONVERSATION = {
  id: 1,
  participants: [MOCK_USER, MOCK_USER_2],
  other_participant: MOCK_USER_2,
  last_message: MOCK_MESSAGE,
  unread_count: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T12:00:00Z",
};

describe("useTeamChatApi hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- teamChatKeys --
  describe("teamChatKeys", () => {
    it("builds users key", () => {
      expect(teamChatKeys.users()).toEqual(["teamChat", "users"]);
    });

    it("builds conversations key", () => {
      expect(teamChatKeys.conversations()).toEqual([
        "teamChat",
        "conversations",
      ]);
    });

    it("builds single conversation key", () => {
      expect(teamChatKeys.conversation(5)).toEqual([
        "teamChat",
        "conversations",
        5,
      ]);
    });

    it("builds conversationWithUser key", () => {
      expect(teamChatKeys.conversationWithUser(42)).toEqual([
        "teamChat",
        "conversations",
        "with",
        42,
      ]);
    });

    it("builds unreadCount key", () => {
      expect(teamChatKeys.unreadCount()).toEqual(["teamChat", "unreadCount"]);
    });
  });

  // -- useTeamChatUsers --
  describe("useTeamChatUsers", () => {
    it("fetches team users", async () => {
      mockAxiosGet.mockResolvedValue({ data: [MOCK_USER, MOCK_USER_2] });

      const { result } = renderHook(() => useTeamChatUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data![0].full_name).toBe("Alice Smith");
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/team-chat/users/");
    });

    it("includes online status", async () => {
      mockAxiosGet.mockResolvedValue({ data: [MOCK_USER, MOCK_USER_2] });

      const { result } = renderHook(() => useTeamChatUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data![0].is_online).toBe(true);
      expect(result.current.data![1].is_online).toBe(false);
    });

    it("can be disabled via options", () => {
      const { result } = renderHook(
        () => useTeamChatUsers({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useTeamChatUsers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- useTeamChatConversations --
  describe("useTeamChatConversations", () => {
    it("fetches conversations from paginated response", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { results: [MOCK_CONVERSATION] },
      });

      const { result } = renderHook(() => useTeamChatConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].id).toBe(1);
    });

    it("handles non-paginated response", async () => {
      mockAxiosGet.mockResolvedValue({ data: [MOCK_CONVERSATION] });

      const { result } = renderHook(() => useTeamChatConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it("can be disabled", () => {
      const { result } = renderHook(
        () => useTeamChatConversations({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // -- useTeamChatConversation --
  describe("useTeamChatConversation", () => {
    it("fetches single conversation with messages", async () => {
      const convWithMessages = {
        ...MOCK_CONVERSATION,
        messages: [MOCK_MESSAGE],
      };
      mockAxiosGet.mockResolvedValue({ data: convWithMessages });

      const { result } = renderHook(() => useTeamChatConversation(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.messages).toHaveLength(1);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/team-chat/conversations/1/"
      );
    });

    it("is disabled when id is null", () => {
      const { result } = renderHook(() => useTeamChatConversation(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });
  });

  // -- useTeamChatConversationWithUser --
  describe("useTeamChatConversationWithUser", () => {
    it("gets or creates conversation with user", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_CONVERSATION });

      const { result } = renderHook(
        () => useTeamChatConversationWithUser(2),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/team-chat/conversations/with/2/"
      );
    });

    it("is disabled when userId is null", () => {
      const { result } = renderHook(
        () => useTeamChatConversationWithUser(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });
  });

  // -- useTeamChatUnreadCount --
  describe("useTeamChatUnreadCount", () => {
    it("fetches unread count", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 5 } });

      const { result } = renderHook(() => useTeamChatUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(5);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/team-chat/unread-count/"
      );
    });

    it("returns 0 when no unread", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0 } });

      const { result } = renderHook(() => useTeamChatUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(0);
    });
  });

  // -- Mutations --
  describe("useSendTeamChatMessage", () => {
    it("sends text message via FormData", async () => {
      mockAxiosPost.mockResolvedValue({ data: MOCK_MESSAGE });

      const { result } = renderHook(() => useSendTeamChatMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          conversation_id: 1,
          text: "Hello!",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/team-chat/messages/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });

    it("sends message by recipient_id", async () => {
      mockAxiosPost.mockResolvedValue({ data: MOCK_MESSAGE });

      const { result } = renderHook(() => useSendTeamChatMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          recipient_id: 2,
          text: "Hi Bob!",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const formData = mockAxiosPost.mock.calls[0][1] as FormData;
      expect(formData.get("recipient_id")).toBe("2");
      expect(formData.get("text")).toBe("Hi Bob!");
    });

    it("includes file in FormData", async () => {
      mockAxiosPost.mockResolvedValue({ data: MOCK_MESSAGE });
      const mockFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const { result } = renderHook(() => useSendTeamChatMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          conversation_id: 1,
          text: "See attached",
          message_type: "file",
          file: mockFile,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const formData = mockAxiosPost.mock.calls[0][1] as FormData;
      expect(formData.get("file")).toBeTruthy();
      expect(formData.get("message_type")).toBe("file");
    });

    it("handles send error", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Failed to send"));

      const { result } = renderHook(() => useSendTeamChatMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ conversation_id: 1, text: "Test" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useMarkConversationRead", () => {
    it("marks conversation as read", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useMarkConversationRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/team-chat/conversations/1/mark_read/"
      );
    });
  });

  describe("useClearChatHistory", () => {
    it("clears conversation history", async () => {
      mockAxiosDelete.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useClearChatHistory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/team-chat/conversations/1/clear_history/"
      );
    });

    it("handles clear error", async () => {
      mockAxiosDelete.mockRejectedValue(new Error("Forbidden"));

      const { result } = renderHook(() => useClearChatHistory(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useHideChatForMe", () => {
    it("hides conversation via generated API", async () => {
      mockHideForMe.mockResolvedValue({} as any);

      const { result } = renderHook(() => useHideChatForMe(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockHideForMe).toHaveBeenCalledWith("1");
    });

    it("handles hide error", async () => {
      mockHideForMe.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useHideChatForMe(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
