/**
 * Tests for useSocial hooks.
 * Tests social settings, unread count, mark read/unread.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/api/generated", () => ({
  socialFacebookSendMessageCreate: vi.fn(),
  socialWhatsappOauthStartRetrieve: vi.fn(),
  socialWhatsappTemplatesList: vi.fn(),
  socialWhatsappTemplatesSyncCreate: vi.fn(),
  socialWhatsappTemplatesCreateCreate: vi.fn(),
  socialWhatsappTemplatesDeleteDestroy: vi.fn(),
  socialWhatsappTemplatesSendCreate: vi.fn(),
  WhatsAppTemplateCreateRequest: vi.fn(),
  WhatsAppTemplateSendRequest: vi.fn(),
  socialEmailStatusRetrieve: vi.fn(),
  socialEmailMessagesThreadsRetrieve: vi.fn(),
  socialEmailFoldersRetrieve: vi.fn(),
  socialEmailDraftsList: vi.fn(),
  socialEmailDraftsCreate: vi.fn(),
  socialEmailDraftsPartialUpdate: vi.fn(),
  socialEmailDraftsDestroy: vi.fn(),
  socialConversationsRetrieve: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import {
  useUnreadMessagesCount,
  useMarkConversationRead,
  useMarkConversationUnread,
  useDeleteConversation,
  useFacebookStatus,
  useFacebookPages,
  useFacebookMessages,
  useSendFacebookMessage,
} from "@/hooks/api/useSocial";
import type { UnreadMessagesCount } from "@/hooks/api/useSocial";
import axiosInstance from "@/api/axios";

const mockAxiosGet = vi.mocked(axiosInstance.get);
const mockAxiosPost = vi.mocked(axiosInstance.post);
const mockAxiosDelete = vi.mocked(axiosInstance.delete);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchInterval: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSocial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useUnreadMessagesCount", () => {
    it("fetches unread count", async () => {
      const mockCount: UnreadMessagesCount = {
        total: 10,
        facebook: 3,
        instagram: 2,
        whatsapp: 4,
        email: 1,
      };
      mockAxiosGet.mockResolvedValue({ data: mockCount });

      const { result } = renderHook(
        () => useUnreadMessagesCount({ refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total).toBe(10);
      expect(result.current.data?.facebook).toBe(3);
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(
        () => useUnreadMessagesCount({ refetchInterval: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useMarkConversationRead", () => {
    it("calls mark-read endpoint", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useMarkConversationRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          platform: "facebook",
          conversation_id: "conv-123",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/social/mark-read/", {
        platform: "facebook",
        conversation_id: "conv-123",
      });
    });
  });

  describe("useMarkConversationUnread", () => {
    it("calls mark-unread endpoint", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useMarkConversationUnread(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          platform: "instagram",
          conversation_id: "conv-456",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/social/mark-unread/", {
        platform: "instagram",
        conversation_id: "conv-456",
      });
    });
  });

  describe("useDeleteConversation", () => {
    it("calls delete-conversation endpoint", async () => {
      mockAxiosDelete.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useDeleteConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          platform: "whatsapp",
          conversation_id: "conv-789",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/social/delete-conversation/",
        {
          data: {
            platform: "whatsapp",
            conversation_id: "conv-789",
          },
        }
      );
    });
  });

  describe("useFacebookStatus", () => {
    it("fetches facebook status", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { connected: true, pages_count: 2 },
      });

      const { result } = renderHook(() => useFacebookStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.connected).toBe(true);
    });
  });

  describe("useFacebookPages", () => {
    it("fetches facebook pages", async () => {
      mockAxiosGet.mockResolvedValue({
        data: [
          { id: 1, page_id: "pg-1", name: "Test Page" },
        ],
      });

      const { result } = renderHook(() => useFacebookPages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe("useFacebookMessages", () => {
    it("fetches facebook messages", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          count: 1,
          results: [{ id: 1, message_text: "Hello" }],
        },
      });

      const { result } = renderHook(
        () => useFacebookMessages({ page_id: "pg-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("passes search filter", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 0, results: [] },
      });

      renderHook(
        () => useFacebookMessages({ page_id: "pg-1", search: "hello" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.stringContaining("search=hello")
        )
      );
    });
  });
});
