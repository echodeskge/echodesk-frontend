/**
 * Tests for useAutoPost hooks.
 * Tests settings fetch, update, queue management, and post operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import {
  useAutoPostSettings,
  useUpdateAutoPostSettings,
  usePublishingStatus,
  useAutoPostList,
  useAutoPostDetail,
  useApprovePost,
  useRejectPost,
  useEditPost,
  useGeneratePost,
  usePublishPost,
  useStartPublishingOAuth,
} from "@/hooks/api/useAutoPost";
import type { AutoPostSettings, AutoPostContent, PaginatedAutoPostList, PublishingStatus } from "@/hooks/api/useAutoPost";
import axiosInstance from "@/api/axios";

const mockAxiosGet = vi.mocked(axiosInstance.get);
const mockAxiosPost = vi.mocked(axiosInstance.post);
const mockAxiosPut = vi.mocked(axiosInstance.put);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_SETTINGS: AutoPostSettings = {
  id: 1,
  is_enabled: true,
  company_description: "Test company",
  posting_time: "09:00",
  timezone: "UTC",
  post_to_facebook: true,
  post_to_instagram: false,
  tone: "professional",
  content_source: "products",
  content_language: "en",
  require_approval: true,
  max_posts_per_day: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const MOCK_POST: AutoPostContent = {
  id: 1,
  status: "draft",
  facebook_text: "Check out our new product!",
  instagram_text: "Check out our new product!",
  image_url: null,
  featured_product: null,
  featured_product_name: null,
  target_facebook: true,
  target_instagram: false,
  scheduled_for: "2024-01-01T09:00:00Z",
  facebook_post_id: null,
  instagram_media_id: null,
  published_at: null,
  error_message: "",
  ai_model_used: "gpt-4",
  approved_by: null,
  approved_by_name: null,
  approved_at: null,
  rejected_by: null,
  rejected_by_name: null,
  rejected_at: null,
  rejection_reason: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("useAutoPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useAutoPostSettings", () => {
    it("fetches settings", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_SETTINGS });

      const { result } = renderHook(() => useAutoPostSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.is_enabled).toBe(true);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/social/auto-post/settings/");
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useAutoPostSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateAutoPostSettings", () => {
    it("updates settings via PUT", async () => {
      mockAxiosPut.mockResolvedValue({ data: { ...MOCK_SETTINGS, is_enabled: false } });

      const { result } = renderHook(() => useUpdateAutoPostSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ is_enabled: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPut).toHaveBeenCalledWith(
        "/api/social/auto-post/settings/",
        { is_enabled: false }
      );
    });
  });

  describe("usePublishingStatus", () => {
    it("fetches publishing status", async () => {
      const mockStatus: PublishingStatus = {
        facebook_pages: [
          { id: 1, page_id: "pg-1", page_name: "Test Page", has_publishing_permission: true },
        ],
        instagram_accounts: [],
      };
      mockAxiosGet.mockResolvedValue({ data: mockStatus });

      const { result } = renderHook(() => usePublishingStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.facebook_pages).toHaveLength(1);
    });
  });

  describe("useAutoPostList", () => {
    it("fetches post list", async () => {
      const mockList: PaginatedAutoPostList = {
        count: 1,
        next: null,
        previous: null,
        results: [MOCK_POST],
      };
      mockAxiosGet.mockResolvedValue({ data: mockList });

      const { result } = renderHook(() => useAutoPostList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(1);
    });

    it("passes status filter", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      renderHook(() => useAutoPostList({ status: "draft", page: 2 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.stringContaining("status=draft")
        )
      );
    });
  });

  describe("useAutoPostDetail", () => {
    it("fetches post by ID", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_POST });

      const { result } = renderHook(() => useAutoPostDetail(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(1);
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useAutoPostDetail(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useApprovePost", () => {
    it("calls approve endpoint", async () => {
      mockAxiosPost.mockResolvedValue({ data: { status: "approved" } });

      const { result } = renderHook(() => useApprovePost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/social/auto-post/1/approve/");
    });
  });

  describe("useRejectPost", () => {
    it("calls reject endpoint with reason", async () => {
      mockAxiosPost.mockResolvedValue({ data: { status: "rejected" } });

      const { result } = renderHook(() => useRejectPost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, reason: "Not appropriate" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/social/auto-post/1/reject/",
        { reason: "Not appropriate" }
      );
    });
  });

  describe("useEditPost", () => {
    it("calls edit endpoint", async () => {
      mockAxiosPut.mockResolvedValue({ data: MOCK_POST });

      const { result } = renderHook(() => useEditPost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { facebook_text: "Updated text" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPut).toHaveBeenCalledWith(
        "/api/social/auto-post/1/edit/",
        { facebook_text: "Updated text" }
      );
    });
  });

  describe("useGeneratePost", () => {
    it("calls generate endpoint", async () => {
      mockAxiosPost.mockResolvedValue({ data: MOCK_POST });

      const { result } = renderHook(() => useGeneratePost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/social/auto-post/generate/");
    });
  });

  describe("usePublishPost", () => {
    it("calls publish endpoint", async () => {
      mockAxiosPost.mockResolvedValue({ data: { status: "published" } });

      const { result } = renderHook(() => usePublishPost(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/social/auto-post/1/publish/");
    });
  });

  describe("useStartPublishingOAuth", () => {
    it("calls OAuth start endpoint", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { url: "https://facebook.com/oauth" },
      });

      const { result } = renderHook(() => useStartPublishingOAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/social/facebook/oauth/start-publishing/"
      );
    });
  });
});
