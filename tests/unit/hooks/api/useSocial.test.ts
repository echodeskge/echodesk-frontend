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
  useSendEmail,
  useSendWhatsAppTemplateMessage,
} from "@/hooks/api/useSocial";
import type { UnreadMessagesCount } from "@/hooks/api/useSocial";
import { socialWhatsappTemplatesSendCreate } from "@/api/generated";

const mockSendTemplate = vi.mocked(socialWhatsappTemplatesSendCreate);
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

  describe("useSendEmail", () => {
    it("sends JSON (no FormData) when there are no attachments", async () => {
      mockAxiosPost.mockResolvedValue({ data: { status: "success" } });

      const { result } = renderHook(() => useSendEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to_emails: ["alice@example.com"],
          subject: "Hi",
          body_text: "Hello",
          body_html: "<div>Hello</div>",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      const [url, payload] = mockAxiosPost.mock.calls[0];
      expect(url).toBe("/api/social/email/send/");
      // Plain object body, NOT FormData, and no attachments key leaks through.
      expect(payload).not.toBeInstanceOf(FormData);
      expect(payload).toMatchObject({
        to_emails: ["alice@example.com"],
        subject: "Hi",
      });
      expect((payload as Record<string, unknown>).attachments).toBeUndefined();
    });

    it("sends multipart/form-data with files and repeated array fields when attachments are present", async () => {
      mockAxiosPost.mockResolvedValue({ data: { status: "success" } });

      const file = new File(["hello"], "doc.pdf", { type: "application/pdf" });

      const { result } = renderHook(() => useSendEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          to_emails: ["alice@example.com", "bob@example.com"],
          cc_emails: ["cc@example.com"],
          subject: "With file",
          body_text: "See attached",
          body_html: "<div>See attached</div>",
          connection_id: 7,
          reply_to_message_id: 42,
          attachments: [file],
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      const [url, payload] = mockAxiosPost.mock.calls[0];
      expect(url).toBe("/api/social/email/send/");
      expect(payload).toBeInstanceOf(FormData);

      const fd = payload as FormData;
      // Array fields are appended as repeated keys so DRF ListField.getlist() works.
      expect(fd.getAll("to_emails")).toEqual([
        "alice@example.com",
        "bob@example.com",
      ]);
      expect(fd.getAll("cc_emails")).toEqual(["cc@example.com"]);
      expect(fd.get("subject")).toBe("With file");
      expect(fd.get("connection_id")).toBe("7");
      expect(fd.get("reply_to_message_id")).toBe("42");
      const sentFile = fd.get("attachments") as File;
      expect(sentFile).toBeInstanceOf(File);
      expect(sentFile.name).toBe("doc.pdf");
    });
  });

  describe("useSendWhatsAppTemplateMessage", () => {
    it("invalidates both whatsapp messages and the unified conversations on success", async () => {
      mockSendTemplate.mockResolvedValue({ id: 1 } as never);
      const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");

      const { result } = renderHook(() => useSendWhatsAppTemplateMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          waba_id: "waba1",
          template_id: 7,
          to_number: "+15551234567",
          parameters: { param1: "Ann" },
          opt_in_confirmed: true,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const invalidatedKeys = invalidateSpy.mock.calls
        .map((c) => JSON.stringify((c[0] as { queryKey?: unknown })?.queryKey ?? ""))
        .join("|");
      expect(invalidatedKeys).toContain("messages");
      expect(invalidatedKeys).toContain("conversations");

      invalidateSpy.mockRestore();
    });
  });
});
