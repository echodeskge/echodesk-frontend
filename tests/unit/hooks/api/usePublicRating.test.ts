/**
 * Tests for usePublicRating hooks.
 *
 * Covers:
 * - useRatingInfo: token validation, expired tokens, already-rated tokens
 * - useSubmitRating: rating submission with token and data
 * - Error handling for various HTTP status codes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  socialPublicRatingRetrieve: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import { useRatingInfo, useSubmitRating } from "@/hooks/api/usePublicRating";
import { socialPublicRatingRetrieve } from "@/api/generated";
import axios from "@/api/axios";

const mockRatingRetrieve = vi.mocked(socialPublicRatingRetrieve);
const mockAxiosPost = vi.mocked(axios.post);

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

describe("usePublicRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- useRatingInfo --

  describe("useRatingInfo", () => {
    it("fetches rating info with valid token", async () => {
      mockRatingRetrieve.mockResolvedValue({
        valid: true,
        tenant_name: "Acme Corp",
        tenant_logo_url: "https://example.com/logo.png",
      } as any);

      const { result } = renderHook(() => useRatingInfo("abc-token-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.valid).toBe(true);
      expect(result.current.data?.tenant_name).toBe("Acme Corp");
      expect(mockRatingRetrieve).toHaveBeenCalledWith("abc-token-123");
    });

    it("is disabled when token is null", () => {
      const { result } = renderHook(() => useRatingInfo(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockRatingRetrieve).not.toHaveBeenCalled();
    });

    it("returns invalid for null token passed to queryFn", async () => {
      // Simulate the queryFn's null-token check
      const { result } = renderHook(() => useRatingInfo(null), {
        wrapper: createWrapper(),
      });

      // Query should be disabled so the queryFn never runs
      expect(result.current.data).toBeUndefined();
    });

    it("handles 404 error (invalid token)", async () => {
      mockRatingRetrieve.mockRejectedValue({
        response: { status: 404 },
      });

      const { result } = renderHook(() => useRatingInfo("invalid-token"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.valid).toBe(false);
      expect(result.current.data?.error).toBe("Invalid token");
    });

    it("handles 410 error (expired token)", async () => {
      mockRatingRetrieve.mockRejectedValue({
        response: { status: 410 },
      });

      const { result } = renderHook(() => useRatingInfo("expired-token"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.valid).toBe(false);
      expect(result.current.data?.expired).toBe(true);
      expect(result.current.data?.error).toBe("Token has expired");
    });

    it("handles 409 error (already rated)", async () => {
      mockRatingRetrieve.mockRejectedValue({
        response: { status: 409 },
      });

      const { result } = renderHook(() => useRatingInfo("rated-token"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.valid).toBe(false);
      expect(result.current.data?.already_rated).toBe(true);
      expect(result.current.data?.error).toBe("Already rated");
    });

    it("handles generic error", async () => {
      mockRatingRetrieve.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useRatingInfo("some-token"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.valid).toBe(false);
      expect(result.current.data?.error).toBe("Failed to validate token");
    });
  });

  // -- useSubmitRating --

  describe("useSubmitRating", () => {
    it("submits rating successfully", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { success: true, message: "Rating submitted" },
      });

      const { result } = renderHook(() => useSubmitRating(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          token: "abc-token",
          data: { rating: 5, comment: "Great service!" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.success).toBe(true);
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/social/public/rating/abc-token/submit/",
        { rating: 5, comment: "Great service!" }
      );
    });

    it("submits rating without comment", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useSubmitRating(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          token: "abc-token",
          data: { rating: 1 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/social/public/rating/abc-token/submit/",
        { rating: 1 }
      );
    });

    it("handles submission error", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useSubmitRating(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          token: "abc-token",
          data: { rating: 3 },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("submits medium rating (3)", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { success: true, redirect_url: "/thank-you" },
      });

      const { result } = renderHook(() => useSubmitRating(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          token: "token-xyz",
          data: { rating: 3, comment: "OK" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.redirect_url).toBe("/thank-you");
    });
  });
});
