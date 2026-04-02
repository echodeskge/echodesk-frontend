/**
 * Tests for useSocialClients hooks.
 * Frontend counterpart of backend test_client_views.py.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  socialClientsRetrieve: vi.fn(),
  socialClientsCreate: vi.fn(),
  socialClientsUpdate: vi.fn(),
  socialClientsPartialUpdate: vi.fn(),
  socialClientsDestroy: vi.fn(),
  socialClientsCustomFieldsList: vi.fn(),
  socialClientsCustomFieldsCreate: vi.fn(),
  socialClientsCustomFieldsUpdate: vi.fn(),
  socialClientsCustomFieldsDestroy: vi.fn(),
  socialClientsList: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import {
  useSocialClients,
  useSocialClient,
  useCreateSocialClient,
  useUpdateSocialClient,
  usePatchSocialClient,
  useDeleteSocialClient,
  useLinkSocialAccount,
  useUnlinkSocialAccount,
  socialClientKeys,
} from "@/hooks/api/useSocialClients";
import {
  socialClientsRetrieve,
  socialClientsCreate,
  socialClientsUpdate,
  socialClientsPartialUpdate,
  socialClientsDestroy,
} from "@/api/generated";
import axios from "@/api/axios";

const mockAxiosGet = vi.mocked(axios.get);
const mockAxiosPost = vi.mocked(axios.post);
const mockRetrieve = vi.mocked(socialClientsRetrieve);
const mockCreate = vi.mocked(socialClientsCreate);
const mockUpdate = vi.mocked(socialClientsUpdate);
const mockPartialUpdate = vi.mocked(socialClientsPartialUpdate);
const mockDestroy = vi.mocked(socialClientsDestroy);

const MOCK_CLIENT = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  notes: "",
  social_accounts: [],
  custom_field_values: {},
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

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

// ---------------------------------------------------------------------------
// socialClientKeys (pure)
// ---------------------------------------------------------------------------

describe("socialClientKeys", () => {
  it("all key", () => {
    expect(socialClientKeys.all).toEqual(["socialClients"]);
  });

  it("lists key", () => {
    expect(socialClientKeys.lists()).toEqual(["socialClients", "list"]);
  });

  it("list key with filters", () => {
    const filters = { search: "John", page: 1 };
    expect(socialClientKeys.list(filters)).toEqual([
      "socialClients",
      "list",
      filters,
    ]);
  });

  it("detail key", () => {
    expect(socialClientKeys.detail(42)).toEqual([
      "socialClients",
      "detail",
      42,
    ]);
  });

  it("byAccount key", () => {
    expect(socialClientKeys.byAccount("facebook", "fb_123", "conn_1")).toEqual([
      "socialClients",
      "byAccount",
      "facebook",
      "fb_123",
      "conn_1",
    ]);
  });

  it("customFields key", () => {
    expect(socialClientKeys.customFields()).toEqual([
      "socialClients",
      "customFields",
    ]);
  });

  it("customFieldList key with filters", () => {
    expect(socialClientKeys.customFieldList({ is_active: true })).toEqual([
      "socialClients",
      "customFields",
      { is_active: true },
    ]);
  });

  it("bookingHistory key", () => {
    expect(socialClientKeys.bookingHistory(1, { page: 2 })).toEqual([
      "socialClients",
      "bookingHistory",
      1,
      { page: 2 },
    ]);
  });

  it("bookingStats key", () => {
    expect(socialClientKeys.bookingStats(5)).toEqual([
      "socialClients",
      "bookingStats",
      5,
    ]);
  });
});

// ---------------------------------------------------------------------------
// useSocialClients (list)
// ---------------------------------------------------------------------------

describe("useSocialClients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches clients list", async () => {
    mockAxiosGet.mockResolvedValue({
      data: { count: 1, results: [MOCK_CLIENT] },
    });

    const { result } = renderHook(() => useSocialClients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(1);
    expect(result.current.data?.results).toHaveLength(1);
  });

  it("passes filters as query params", async () => {
    mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

    renderHook(() => useSocialClients({ search: "Jane", page: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/social/clients/", {
        params: { search: "Jane", page: 2 },
      })
    );
  });

  it("handles empty results", async () => {
    mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

    const { result } = renderHook(() => useSocialClients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toEqual([]);
  });

  it("handles API error", async () => {
    mockAxiosGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSocialClients(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useSocialClient (single)
// ---------------------------------------------------------------------------

describe("useSocialClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches a single client by ID", async () => {
    mockRetrieve.mockResolvedValue(MOCK_CLIENT as any);

    const { result } = renderHook(() => useSocialClient(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(1);
    expect(mockRetrieve).toHaveBeenCalledWith(1);
  });

  it("respects enabled option", () => {
    const { result } = renderHook(
      () => useSocialClient(1, { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockRetrieve).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCreateSocialClient
// ---------------------------------------------------------------------------

describe("useCreateSocialClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new client", async () => {
    mockCreate.mockResolvedValue(MOCK_CLIENT as any);

    const { result } = renderHook(() => useCreateSocialClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: "New Client" } as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith({ name: "New Client" });
  });
});

// ---------------------------------------------------------------------------
// useUpdateSocialClient
// ---------------------------------------------------------------------------

describe("useUpdateSocialClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an existing client", async () => {
    mockUpdate.mockResolvedValue({ ...MOCK_CLIENT, name: "Updated" } as any);

    const { result } = renderHook(() => useUpdateSocialClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, data: { name: "Updated" } as any });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith(1, { name: "Updated" });
  });
});

// ---------------------------------------------------------------------------
// usePatchSocialClient
// ---------------------------------------------------------------------------

describe("usePatchSocialClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("partially updates a client", async () => {
    mockPartialUpdate.mockResolvedValue({ ...MOCK_CLIENT, name: "Patched" } as any);

    const { result } = renderHook(() => usePatchSocialClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, data: { name: "Patched" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPartialUpdate).toHaveBeenCalledWith(1, { name: "Patched" });
  });
});

// ---------------------------------------------------------------------------
// useDeleteSocialClient
// ---------------------------------------------------------------------------

describe("useDeleteSocialClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a client by ID", async () => {
    mockDestroy.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useDeleteSocialClient(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDestroy).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// useLinkSocialAccount
// ---------------------------------------------------------------------------

describe("useLinkSocialAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links a social account to a client", async () => {
    mockAxiosPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useLinkSocialAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        clientId: 1,
        data: {
          platform: "facebook",
          platform_id: "fb_123",
          account_connection_id: "conn_1",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosPost).toHaveBeenCalledWith(
      "/api/social/clients/1/link_account/",
      {
        platform: "facebook",
        platform_id: "fb_123",
        account_connection_id: "conn_1",
      }
    );
  });
});

// ---------------------------------------------------------------------------
// useUnlinkSocialAccount
// ---------------------------------------------------------------------------

describe("useUnlinkSocialAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unlinks a social account from a client", async () => {
    mockAxiosPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useUnlinkSocialAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        clientId: 1,
        data: {
          platform: "instagram",
          platform_id: "ig_456",
          account_connection_id: "conn_2",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAxiosPost).toHaveBeenCalledWith(
      "/api/social/clients/1/unlink_account/",
      {
        platform: "instagram",
        platform_id: "ig_456",
        account_connection_id: "conn_2",
      }
    );
  });
});
