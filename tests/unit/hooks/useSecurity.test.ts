/**
 * Tests for useSecurity hooks.
 * Frontend counterpart of backend test_security_views.py:
 *   - useSecurityLogs query with filters
 *   - useSecurityLogsStats query with days param
 *   - useMySecurityLogs query with pagination
 *   - useIPWhitelist query
 *   - useCurrentIP query
 *   - Mutations: useCreateIPWhitelist, useUpdateIPWhitelist,
 *     useDeleteIPWhitelist, useToggleIPWhitelist
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  listSecurityLogs: vi.fn(),
  securityLogsStats: vi.fn(),
  mySecurityLogs: vi.fn(),
  listIpWhitelist: vi.fn(),
  createIpWhitelist: vi.fn(),
  manageIpWhitelist: vi.fn(),
  manageIpWhitelist2: vi.fn(),
  manageIpWhitelist3: vi.fn(),
  toggleIpWhitelist: vi.fn(),
  getCurrentIp: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import {
  useSecurityLogs,
  useSecurityLogsStats,
  useMySecurityLogs,
  useIPWhitelist,
  useCurrentIP,
  useCreateIPWhitelist,
  useUpdateIPWhitelist,
  useDeleteIPWhitelist,
  useToggleIPWhitelist,
  securityKeys,
} from "@/hooks/api/useSecurity";
import {
  listSecurityLogs,
  securityLogsStats,
  mySecurityLogs,
  listIpWhitelist,
  createIpWhitelist,
  manageIpWhitelist,
  manageIpWhitelist2,
  getCurrentIp,
} from "@/api/generated/api";
import axios from "@/api/axios";
import { authService } from "@/services/auth";

const mockListSecurityLogs = vi.mocked(listSecurityLogs);
const mockSecurityLogsStats = vi.mocked(securityLogsStats);
const mockMySecurityLogs = vi.mocked(mySecurityLogs);
const mockListIpWhitelist = vi.mocked(listIpWhitelist);
const mockCreateIpWhitelist = vi.mocked(createIpWhitelist);
const mockManageIpWhitelist = vi.mocked(manageIpWhitelist);
const mockManageIpWhitelist2 = vi.mocked(manageIpWhitelist2);
const mockGetCurrentIp = vi.mocked(getCurrentIp);
const mockAxiosPost = vi.mocked(axios.post);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

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

const MOCK_LOG = {
  id: 1,
  user_email: "test@example.com",
  event_type: "login_success",
  event_type_display: "Login Success",
  ip_address: "192.168.1.100",
  device_type: "desktop",
  browser: "Chrome",
  operating_system: "macOS",
  created_at: "2024-01-01T00:00:00Z",
};

const MOCK_STATS = {
  total_logins: 150,
  failed_logins: 12,
  unique_ips: 45,
  unique_users: 20,
  by_event_type: { login_success: 138, login_failed: 12 },
  by_device_type: { desktop: 100, mobile: 50 },
  by_date: [],
  recent_failed_logins: [],
  top_ips: [{ ip_address: "192.168.1.1", count: 50 }],
  period_days: 30,
};

const MOCK_WHITELIST = {
  ip_whitelist_enabled: false,
  superadmin_bypass_whitelist: true,
  entries: [
    {
      id: 1,
      ip_address: "10.0.0.1",
      description: "Office",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
  ],
};

describe("useSecurity hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  // -- securityKeys --
  describe("securityKeys", () => {
    it("builds logs list key with filters", () => {
      const filters = { event_type: "login_failed" as const };
      expect(securityKeys.logsList(filters)).toEqual([
        "security",
        "logs",
        "list",
        filters,
      ]);
    });

    it("builds stats key with days", () => {
      expect(securityKeys.logsStats(7)).toEqual([
        "security",
        "logs",
        "stats",
        7,
      ]);
    });

    it("builds whitelist key", () => {
      expect(securityKeys.whitelist()).toEqual(["security", "whitelist"]);
    });

    it("builds currentIp key", () => {
      expect(securityKeys.currentIp()).toEqual(["security", "currentIp"]);
    });
  });

  // -- useSecurityLogs --
  describe("useSecurityLogs", () => {
    it("fetches security logs", async () => {
      mockListSecurityLogs.mockResolvedValue({
        count: 2,
        results: [MOCK_LOG, { ...MOCK_LOG, id: 2 }],
      } as any);

      const { result } = renderHook(() => useSecurityLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("passes filters to API", async () => {
      mockListSecurityLogs.mockResolvedValue({
        count: 1,
        results: [MOCK_LOG],
      } as any);

      const filters = {
        event_type: "login_failed" as const,
        ip_address: "1.2.3.4",
        search: "test",
      };

      const { result } = renderHook(() => useSecurityLogs(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockListSecurityLogs).toHaveBeenCalledWith(
        undefined, // date_from
        undefined, // date_to
        "login_failed", // event_type
        "1.2.3.4", // ip_address
        undefined, // page
        undefined, // page_size
        "test", // search
        undefined // user_id
      );
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useSecurityLogs(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockListSecurityLogs).not.toHaveBeenCalled();
    });

    it("can be disabled via options", () => {
      const { result } = renderHook(
        () => useSecurityLogs({}, { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // -- useSecurityLogsStats --
  describe("useSecurityLogsStats", () => {
    it("fetches stats with default 30 days", async () => {
      mockSecurityLogsStats.mockResolvedValue(MOCK_STATS as any);

      const { result } = renderHook(() => useSecurityLogsStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.total_logins).toBe(150);
      expect(result.current.data?.failed_logins).toBe(12);
      expect(mockSecurityLogsStats).toHaveBeenCalledWith(30);
    });

    it("respects custom days param", async () => {
      mockSecurityLogsStats.mockResolvedValue({
        ...MOCK_STATS,
        period_days: 7,
      } as any);

      const { result } = renderHook(() => useSecurityLogsStats(7), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSecurityLogsStats).toHaveBeenCalledWith(7);
      expect(result.current.data?.period_days).toBe(7);
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useSecurityLogsStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // -- useMySecurityLogs --
  describe("useMySecurityLogs", () => {
    it("fetches own logs with pagination", async () => {
      mockMySecurityLogs.mockResolvedValue({
        count: 5,
        results: [MOCK_LOG],
      } as any);

      const { result } = renderHook(() => useMySecurityLogs(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockMySecurityLogs).toHaveBeenCalledWith(2, 20);
    });

    it("defaults to page 1", async () => {
      mockMySecurityLogs.mockResolvedValue({
        count: 1,
        results: [MOCK_LOG],
      } as any);

      renderHook(() => useMySecurityLogs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockMySecurityLogs).toHaveBeenCalledWith(1, 20)
      );
    });
  });

  // -- useIPWhitelist --
  describe("useIPWhitelist", () => {
    it("fetches whitelist settings", async () => {
      mockListIpWhitelist.mockResolvedValue(MOCK_WHITELIST as any);

      const { result } = renderHook(() => useIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.ip_whitelist_enabled).toBe(false);
      expect(result.current.data?.entries).toHaveLength(1);
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useIPWhitelist(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // -- useCurrentIP --
  describe("useCurrentIP", () => {
    it("fetches current IP info", async () => {
      mockGetCurrentIp.mockResolvedValue({
        ip_address: "203.0.113.42",
        city: "Tbilisi",
        country: "Georgia",
        country_code: "GE",
      } as any);

      const { result } = renderHook(() => useCurrentIP(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.ip_address).toBe("203.0.113.42");
      expect(result.current.data?.city).toBe("Tbilisi");
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useCurrentIP(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  // -- Mutations --
  describe("useCreateIPWhitelist", () => {
    it("calls createIpWhitelist with data", async () => {
      mockCreateIpWhitelist.mockResolvedValue({
        id: 2,
        ip_address: "192.168.1.1",
        description: "Office VPN",
        is_active: true,
      } as any);

      const { result } = renderHook(() => useCreateIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          ip_address: "192.168.1.1",
          description: "Office VPN",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateIpWhitelist).toHaveBeenCalledWith({
        ip_address: "192.168.1.1",
        description: "Office VPN",
      });
    });

    it("handles create error (duplicate)", async () => {
      mockCreateIpWhitelist.mockRejectedValue(
        new Error("IP already in whitelist")
      );

      const { result } = renderHook(() => useCreateIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ ip_address: "10.0.0.1" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateIPWhitelist", () => {
    it("calls manageIpWhitelist2 with id and data", async () => {
      mockManageIpWhitelist2.mockResolvedValue({
        id: 1,
        ip_address: "10.0.0.1",
        description: "Updated",
        is_active: true,
      } as any);

      const { result } = renderHook(() => useUpdateIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { description: "Updated" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockManageIpWhitelist2).toHaveBeenCalledWith(1, {
        description: "Updated",
      });
    });
  });

  describe("useDeleteIPWhitelist", () => {
    it("calls manageIpWhitelist (delete) with id", async () => {
      mockManageIpWhitelist.mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useDeleteIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockManageIpWhitelist).toHaveBeenCalledWith(1);
    });

    it("handles delete error (not found)", async () => {
      mockManageIpWhitelist.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(99999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useToggleIPWhitelist", () => {
    it("enables whitelist via axios post", async () => {
      mockAxiosPost.mockResolvedValue({
        data: {
          ip_whitelist_enabled: true,
          superadmin_bypass_whitelist: true,
          message: "IP whitelist enabled",
        },
      });

      const { result } = renderHook(() => useToggleIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ enabled: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/security/ip-whitelist/toggle/",
        { enabled: true }
      );
      expect(result.current.data?.ip_whitelist_enabled).toBe(true);
    });

    it("disables whitelist", async () => {
      mockAxiosPost.mockResolvedValue({
        data: {
          ip_whitelist_enabled: false,
          superadmin_bypass_whitelist: true,
          message: "IP whitelist disabled",
        },
      });

      const { result } = renderHook(() => useToggleIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ enabled: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.ip_whitelist_enabled).toBe(false);
    });

    it("toggles superadmin bypass", async () => {
      mockAxiosPost.mockResolvedValue({
        data: {
          ip_whitelist_enabled: false,
          superadmin_bypass_whitelist: false,
          message: "Updated",
        },
      });

      const { result } = renderHook(() => useToggleIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ superadmin_bypass: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.superadmin_bypass_whitelist).toBe(false);
    });

    it("handles toggle error (no entries)", async () => {
      mockAxiosPost.mockRejectedValue(
        new Error("Cannot enable without entries")
      );

      const { result } = renderHook(() => useToggleIPWhitelist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ enabled: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
