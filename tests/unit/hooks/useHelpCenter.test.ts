/**
 * Tests for useHelpCenter hooks.
 * Frontend counterpart of backend test_help_views.py:
 *   - Category listing with filters (forPublic, forDashboard)
 *   - Category detail by slug
 *   - Article listing with filters (category, contentType)
 *   - Article detail by slug (disabled when null)
 *   - Featured articles
 *   - Search (disabled when query < 2 chars)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet } = vi.hoisted(() => {
  const mockGet = vi.fn();
  return { mockGet };
});

vi.mock("axios", () => ({
  default: {
    create: () => ({
      get: mockGet,
    }),
  },
}));

import {
  useHelpCategories,
  useHelpCategory,
  useHelpArticles,
  useHelpArticle,
  useFeaturedArticles,
  useHelpSearch,
  helpCenterKeys,
} from "@/hooks/useHelpCenter";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const MOCK_CATEGORY = {
  id: 1,
  name: "Getting Started",
  slug: "getting-started",
  description: "How to get started",
  icon: "book-open",
  position: 0,
  is_active: true,
  show_on_public: true,
  show_in_dashboard: true,
  required_feature_key: "",
  article_count: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const MOCK_ARTICLE = {
  id: 1,
  title: "First Steps",
  slug: "first-steps",
  summary: "A quick guide",
  content_type: "article" as const,
  content: "<p>Hello</p>",
  position: 0,
  is_active: true,
  is_featured: false,
  show_on_public: true,
  show_in_dashboard: true,
  category_name: "Getting Started",
  category_slug: "getting-started",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("useHelpCenter hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- helpCenterKeys --
  describe("helpCenterKeys", () => {
    it("builds category query key with params", () => {
      const key = helpCenterKeys.categories({ forPublic: true });
      expect(key).toEqual(["helpCenter", "categories", { forPublic: true }]);
    });

    it("builds search query key", () => {
      const key = helpCenterKeys.search("webhooks", { lang: "en" });
      expect(key).toEqual(["helpCenter", "search", "webhooks", { lang: "en" }]);
    });
  });

  // -- useHelpCategories --
  describe("useHelpCategories", () => {
    it("fetches categories", async () => {
      mockGet.mockResolvedValue({ data: [MOCK_CATEGORY] });

      const { result } = renderHook(() => useHelpCategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].slug).toBe("getting-started");
    });

    it("passes for_public param", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpCategories({ forPublic: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("for_public=true");
    });

    it("passes for_dashboard param", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpCategories({ forDashboard: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("for_dashboard=true");
    });

    it("passes lang param", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpCategories({ lang: "ka" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("lang=ka");
    });
  });

  // -- useHelpCategory --
  describe("useHelpCategory", () => {
    it("fetches category by slug", async () => {
      mockGet.mockResolvedValue({
        data: { ...MOCK_CATEGORY, articles: [MOCK_ARTICLE] },
      });

      const { result } = renderHook(
        () => useHelpCategory("getting-started"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.slug).toBe("getting-started");
    });

    it("is disabled when slug is null", () => {
      const { result } = renderHook(() => useHelpCategory(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  // -- useHelpArticles --
  describe("useHelpArticles", () => {
    it("fetches articles", async () => {
      mockGet.mockResolvedValue({ data: [MOCK_ARTICLE] });

      const { result } = renderHook(() => useHelpArticles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it("passes category filter", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpArticles({ category: "guides" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("category=guides");
    });

    it("passes content_type filter", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpArticles({ contentType: "video" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("content_type=video");
    });
  });

  // -- useHelpArticle --
  describe("useHelpArticle", () => {
    it("fetches article by slug", async () => {
      mockGet.mockResolvedValue({ data: MOCK_ARTICLE });

      const { result } = renderHook(() => useHelpArticle("first-steps"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.slug).toBe("first-steps");
    });

    it("is disabled when slug is null", () => {
      const { result } = renderHook(() => useHelpArticle(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  // -- useFeaturedArticles --
  describe("useFeaturedArticles", () => {
    it("fetches featured articles", async () => {
      const featured = { ...MOCK_ARTICLE, is_featured: true };
      mockGet.mockResolvedValue({ data: [featured] });

      const { result } = renderHook(() => useFeaturedArticles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it("passes lang param", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useFeaturedArticles({ lang: "ka" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("lang=ka");
    });
  });

  // -- useHelpSearch --
  describe("useHelpSearch", () => {
    it("searches when query >= 2 chars", async () => {
      mockGet.mockResolvedValue({ data: [MOCK_ARTICLE] });

      const { result } = renderHook(() => useHelpSearch("webhooks"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it("is disabled when query < 2 chars", () => {
      const { result } = renderHook(() => useHelpSearch("a"), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("is disabled for empty query", () => {
      const { result } = renderHook(() => useHelpSearch(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("passes q param in URL", async () => {
      mockGet.mockResolvedValue({ data: [] });

      renderHook(() => useHelpSearch("configure"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      const url = mockGet.mock.calls[0][0] as string;
      expect(url).toContain("q=configure");
    });
  });
});
