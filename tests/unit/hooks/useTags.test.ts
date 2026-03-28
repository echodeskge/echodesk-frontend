/**
 * Tests for useTags hooks.
 * Frontend counterpart of backend test_tag_views.py.
 * Uses renderHook + QueryClientProvider wrapper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  tagsList: vi.fn(),
  tagsCreate: vi.fn(),
  tagsUpdate: vi.fn(),
  tagsDestroy: vi.fn(),
}));

import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import { tagsList, tagsCreate, tagsUpdate, tagsDestroy } from "@/api/generated";

const mockTagsList = vi.mocked(tagsList);
const mockTagsCreate = vi.mocked(tagsCreate);
const mockTagsUpdate = vi.mocked(tagsUpdate);
const mockTagsDestroy = vi.mocked(tagsDestroy);

const MOCK_USER_MINIMAL = {
  id: 1,
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches tags on mount", async () => {
    mockTagsList.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 1,
          name: "bug",
          created_at: "2024-01-01T00:00:00Z",
          created_by: MOCK_USER_MINIMAL,
        },
      ],
    });

    const { result } = renderHook(() => useTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTagsList).toHaveBeenCalled();
  });

  it("returns loading state initially", () => {
    mockTagsList.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useTags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("handles API error", async () => {
    mockTagsList.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useCreateTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls tagsCreate", async () => {
    mockTagsCreate.mockResolvedValue({
      id: 2,
      name: "feature",
      created_at: "2024-01-01T00:00:00Z",
      created_by: MOCK_USER_MINIMAL,
    });

    const { result } = renderHook(() => useCreateTag(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "feature" } as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTagsCreate).toHaveBeenCalled();
  });

  it("handles error", async () => {
    mockTagsCreate.mockRejectedValue(new Error("Create failed"));

    const { result } = renderHook(() => useCreateTag(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "bad" } as any);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls tagsUpdate with id + data", async () => {
    mockTagsUpdate.mockResolvedValue({
      id: 1,
      name: "updated",
      created_at: "2024-01-01T00:00:00Z",
      created_by: MOCK_USER_MINIMAL,
    });

    const { result } = renderHook(() => useUpdateTag(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, data: { name: "updated" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTagsUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ name: "updated" }));
  });
});

describe("useDeleteTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls tagsDestroy", async () => {
    mockTagsDestroy.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTag(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTagsDestroy).toHaveBeenCalledWith(1);
  });
});
