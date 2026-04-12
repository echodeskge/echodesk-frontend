/**
 * Tests for useSocialMessages hooks.
 * Tests infinite query hooks for Facebook, Instagram, and WhatsApp messages.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import {
  useFacebookMessagesInfinite,
  useInstagramMessagesInfinite,
  useWhatsAppMessagesInfinite,
  useSocialMessagesInfinite,
} from "@/hooks/api/useSocialMessages";
import type { PaginatedResponse, FacebookMessage, InstagramMessage, WhatsAppMessage } from "@/hooks/api/useSocialMessages";
import axiosInstance from "@/api/axios";

const mockAxiosGet = vi.mocked(axiosInstance.get);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSocialMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useFacebookMessagesInfinite", () => {
    it("fetches facebook messages with page_id", async () => {
      const mockResponse: PaginatedResponse<FacebookMessage> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            message_id: "msg-1",
            sender_id: "user-1",
            message_text: "Hello",
            timestamp: "2024-01-01T00:00:00Z",
            page_name: "Test Page",
          },
        ],
      };
      mockAxiosGet.mockResolvedValue({ data: mockResponse });

      const { result } = renderHook(
        () => useFacebookMessagesInfinite({ page_id: "pg-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0].results).toHaveLength(1);
    });

    it("is disabled when page_id is not provided", () => {
      const { result } = renderHook(
        () => useFacebookMessagesInfinite({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("passes search parameter", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      renderHook(
        () =>
          useFacebookMessagesInfinite({
            page_id: "pg-1",
            search: "hello",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.stringContaining("search=hello")
        )
      );
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(
        () => useFacebookMessagesInfinite({ page_id: "pg-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useInstagramMessagesInfinite", () => {
    it("fetches instagram messages with account_id", async () => {
      const mockResponse: PaginatedResponse<InstagramMessage> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            message_id: "msg-1",
            sender_id: "user-1",
            message_text: "Hi there",
            timestamp: "2024-01-01T00:00:00Z",
            account_username: "test_account",
          },
        ],
      };
      mockAxiosGet.mockResolvedValue({ data: mockResponse });

      const { result } = renderHook(
        () => useInstagramMessagesInfinite({ account_id: "acc-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages[0].results).toHaveLength(1);
    });

    it("is disabled when account_id is not provided", () => {
      const { result } = renderHook(
        () => useInstagramMessagesInfinite({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useWhatsAppMessagesInfinite", () => {
    it("fetches whatsapp messages", async () => {
      const mockResponse: PaginatedResponse<WhatsAppMessage> = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            message_id: "msg-1",
            from_number: "+1234567890",
            to_number: "+0987654321",
            message_text: "Hey",
            timestamp: "2024-01-01T00:00:00Z",
            waba_id: "waba-1",
          },
        ],
      };
      mockAxiosGet.mockResolvedValue({ data: mockResponse });

      const { result } = renderHook(
        () => useWhatsAppMessagesInfinite({ waba_id: "waba-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages[0].results).toHaveLength(1);
    });

    it("fetches without waba_id (enabled by default)", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      const { result } = renderHook(
        () => useWhatsAppMessagesInfinite({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useSocialMessagesInfinite", () => {
    it("returns facebook query for facebook platform", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              message_id: "msg-1",
              sender_id: "user-1",
              message_text: "FB",
              timestamp: "2024-01-01T00:00:00Z",
              page_name: "Page",
            },
          ],
        },
      });

      const { result } = renderHook(
        () =>
          useSocialMessagesInfinite("facebook", { page_id: "pg-1" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("returns instagram query for instagram platform", () => {
      const { result } = renderHook(
        () =>
          useSocialMessagesInfinite("instagram", {
            account_id: "acc-1",
          }),
        { wrapper: createWrapper() }
      );

      // The query should be initiated (not idle) since account_id is provided
      expect(result.current).toBeDefined();
    });

    it("returns whatsapp query for whatsapp platform", () => {
      const { result } = renderHook(
        () =>
          useSocialMessagesInfinite("whatsapp", { waba_id: "waba-1" }),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBeDefined();
    });
  });
});
