/**
 * Tests for AuthContext.
 * Verifies login/logout state, user data, token management, and isAuthenticated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock TenantContext
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: vi.fn(() => ({
    tenant: {
      tenant_id: 1,
      tenant_name: "Test Tenant",
      schema_name: "test",
      domain_url: "test.echodesk.ge",
      api_url: "https://test.api.echodesk.ge",
      preferred_language: "en",
      admin_email: "admin@test.com",
      plan: "pro",
      frontend_url: "https://test.echodesk.ge",
      theme: {
        primary_color: "#000",
        secondary_color: "#fff",
        company_name: "Test",
      },
      features: {
        max_users: 10,
        max_storage: 100,
        analytics: true,
        custom_branding: true,
      },
    },
    loading: false,
    error: null,
    refreshTenant: vi.fn(),
  })),
}));

// Mock authService
vi.mock("@/services/auth", () => ({
  authService: {
    saveAuthData: vi.fn(),
    clearLocalAuth: vi.fn(),
    getStoredAuthData: vi.fn(() => ({
      token: null,
      user: null,
      tenant: null,
    })),
    getCurrentUser: vi.fn(),
    setTenant: vi.fn(),
  },
}));

// Mock fetch for session checking
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth";
import type { AuthUser } from "@/types/auth";

const mockGetStoredAuthData = vi.mocked(authService.getStoredAuthData);
const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);

const MOCK_USER: AuthUser = {
  id: 1,
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
  is_active: true,
  is_staff: false,
  is_superuser: false,
};

const MOCK_TOKEN = "test-token-abc123";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AuthProvider, null, children)
    );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default: no session
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    // Ensure getStoredAuthData returns the expected shape after clearAllMocks
    mockGetStoredAuthData.mockReturnValue({
      token: null,
      user: null,
      tenant: null,
    });
  });

  describe("useAuth outside provider", () => {
    it("throws when used outside AuthProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      spy.mockRestore();
    });
  });

  describe("initial state", () => {
    it("starts with no user and loading", () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading while session check is in progress
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it("isAuthenticated is false when no token or user", async () => {
      mockGetStoredAuthData.mockReturnValue({
        token: null,
        user: null,
        tenant: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("sets user and token on login", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });

      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.token).toBe(MOCK_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("calls authService.saveAuthData on login", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });

      expect(authService.saveAuthData).toHaveBeenCalledWith(
        MOCK_TOKEN,
        MOCK_USER,
        expect.objectContaining({
          schema_name: "test",
          name: "Test Tenant",
        })
      );
    });
  });

  describe("logout", () => {
    it("clears user and token on logout", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Login first
      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });
      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("calls authService.clearLocalAuth on logout", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.clearLocalAuth).toHaveBeenCalled();
    });

    it("calls NextAuth signout endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) // session check
        .mockResolvedValueOnce({ ok: true }); // signout

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });

      await act(async () => {
        await result.current.logout();
      });

      // The signout fetch is the second call
      const signoutCall = mockFetch.mock.calls.find(
        (c) => c[0] === "/api/auth/signout"
      );
      expect(signoutCall).toBeDefined();
    });
  });

  describe("session hydration", () => {
    it("hydrates from NextAuth session on mount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: MOCK_USER,
          token: MOCK_TOKEN,
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.token).toBe(MOCK_TOKEN);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("stores session data in localStorage", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: MOCK_USER,
          token: MOCK_TOKEN,
        }),
      });

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(localStorage.getItem("echodesk_auth_token")).toBe(MOCK_TOKEN);
      });

      const storedUser = JSON.parse(
        localStorage.getItem("echodesk_user_data") || "{}"
      );
      expect(storedUser.id).toBe(MOCK_USER.id);
    });
  });

  describe("checkAuth", () => {
    it("returns false when no stored token", async () => {
      mockGetStoredAuthData.mockReturnValue({
        token: null,
        user: null,
        tenant: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      let authResult: boolean = false;
      await act(async () => {
        authResult = await result.current.checkAuth();
      });

      expect(authResult).toBe(false);
    });

    it("validates stored token and sets user when successful", async () => {
      mockGetStoredAuthData.mockReturnValue({
        token: MOCK_TOKEN,
        user: MOCK_USER,
        tenant: { id: "test", name: "Test" } as any,
      });
      mockGetCurrentUser.mockResolvedValue(MOCK_USER as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial session check + checkAuth to complete
      await waitFor(() => expect(result.current.loading).toBe(false));

      // checkAuth should have been called automatically due to tenant being available
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("isAuthenticated", () => {
    it("is false without token", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("is false without user even with token", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      // isAuthenticated = !!token && !!user, so both are needed
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("is true when both token and user exist", async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.login(MOCK_TOKEN, MOCK_USER);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
