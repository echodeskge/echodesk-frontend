/**
 * Tests for useLanguages hooks.
 * Tests list, create, update, and delete mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/languageService", () => ({
  languageService: {
    getLanguages: vi.fn(),
    getLanguage: vi.fn(),
    createLanguage: vi.fn(),
    updateLanguage: vi.fn(),
    deleteLanguage: vi.fn(),
  },
}));

import {
  useLanguages,
  useLanguage,
  useCreateLanguage,
  useUpdateLanguage,
  useDeleteLanguage,
} from "@/hooks/useLanguages";
import { languageService } from "@/services/languageService";

const mockGetLanguages = vi.mocked(languageService.getLanguages);
const mockGetLanguage = vi.mocked(languageService.getLanguage);
const mockCreateLanguage = vi.mocked(languageService.createLanguage);
const mockUpdateLanguage = vi.mocked(languageService.updateLanguage);
const mockDeleteLanguage = vi.mocked(languageService.deleteLanguage);

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

describe("useLanguages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list query", () => {
    it("fetches languages", async () => {
      mockGetLanguages.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, code: "en", name: "English" },
          { id: 2, code: "ka", name: "Georgian" },
        ],
      } as Awaited<ReturnType<typeof languageService.getLanguages>>);

      const { result } = renderHook(() => useLanguages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("passes filters to service", async () => {
      mockGetLanguages.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof languageService.getLanguages>>);

      renderHook(() => useLanguages({ ordering: "-name", page: 2 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetLanguages).toHaveBeenCalledWith({
          ordering: "-name",
          page: 2,
        })
      );
    });

    it("handles API error", async () => {
      mockGetLanguages.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useLanguages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useLanguage", () => {
    it("fetches language by ID", async () => {
      mockGetLanguage.mockResolvedValue({
        id: 1,
        code: "en",
        name: "English",
      } as Awaited<ReturnType<typeof languageService.getLanguage>>);

      const { result } = renderHook(() => useLanguage(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.code).toBe("en");
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useLanguage(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetLanguage).not.toHaveBeenCalled();
    });
  });

  describe("useCreateLanguage", () => {
    it("calls createLanguage with data", async () => {
      mockCreateLanguage.mockResolvedValue({
        id: 3,
        code: "de",
        name: "German",
      } as Awaited<ReturnType<typeof languageService.createLanguage>>);

      const { result } = renderHook(() => useCreateLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          code: "de",
          name: "German",
          is_default: false,
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateLanguage).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockCreateLanguage.mockRejectedValue(
        new Error("Language already exists")
      );

      const { result } = renderHook(() => useCreateLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          code: "en",
          name: "English",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateLanguage", () => {
    it("calls updateLanguage with id and data", async () => {
      mockUpdateLanguage.mockResolvedValue({
        id: 1,
        name: "Updated English",
      } as Awaited<ReturnType<typeof languageService.updateLanguage>>);

      const { result } = renderHook(() => useUpdateLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { name: "Updated English" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateLanguage).toHaveBeenCalledWith(1, {
        name: "Updated English",
      });
    });
  });

  describe("useDeleteLanguage", () => {
    it("calls deleteLanguage with ID", async () => {
      mockDeleteLanguage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteLanguage).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockDeleteLanguage.mockRejectedValue(new Error("Cannot delete default"));

      const { result } = renderHook(() => useDeleteLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
