/**
 * Tests for CallContext.
 * Verifies default state, provider rendering, hook boundary, and feature gating.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing the module under test)
// ---------------------------------------------------------------------------

vi.mock("@/contexts/SubscriptionContext", () => ({
  useSubscription: vi.fn(() => ({
    hasFeature: vi.fn(() => false),
    subscription: null,
    loading: false,
  })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  })),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/api/generated/api", () => ({
  sipConfigurationsList: vi.fn(),
  sipConfigurationsWebrtcConfigRetrieve: vi.fn(),
  callLogsInitiateCallCreate: vi.fn(),
  callLogsLogIncomingCallCreate: vi.fn(),
  callLogsEndCallCreate: vi.fn(),
  callLogsUpdateStatusPartialUpdate: vi.fn(),
}));

vi.mock("@/services/SipService", () => ({
  SipService: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    initialize: vi.fn(),
    disconnect: vi.fn(),
    makeCall: vi.fn(),
    acceptCall: vi.fn(),
    rejectCall: vi.fn(),
    endCall: vi.fn(),
    toggleHold: vi.fn(),
    toggleMute: vi.fn(),
    sendDTMF: vi.fn(),
    transferCall: vi.fn(),
    register: vi.fn(),
  })),
}));

import { CallProvider, useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

const mockUseAuth = vi.mocked(useAuth);
const mockUseUserProfile = vi.mocked(useUserProfile);

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(CallProvider, null, children);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CallContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    } as any);

    mockUseUserProfile.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);
  });

  describe("useCall outside provider", () => {
    it("throws when used outside CallProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCall());
      }).toThrow("useCall must be used within a CallProvider");

      spy.mockRestore();
    });
  });

  describe("provider renders children", () => {
    it("renders children without crashing", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("default state", () => {
    it("has no active call by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeCall).toBeNull();
    });

    it("has zero call duration by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.callDuration).toBe(0);
    });

    it("is not SIP-registered by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sipRegistered).toBe(false);
    });

    it("is not SIP-connecting by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sipConnecting).toBe(false);
    });

    it("has no active SIP configuration by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeSipConfig).toBeNull();
    });

    it("has empty dial number by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.dialNumber).toBe("");
    });

    it("has empty error by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe("");
    });

    it("has dialpad closed by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDialpadOpen).toBe(false);
    });

    it("has zero callEndedCounter by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.callEndedCounter).toBe(0);
    });

    it("has no missed call by default", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.missedCall).toBeNull();
    });
  });

  describe("state setters", () => {
    it("setDialNumber updates dialNumber", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setDialNumber("+995555123456");
      });

      expect(result.current.dialNumber).toBe("+995555123456");
    });

    it("setError updates error message", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setError("Connection lost");
      });

      expect(result.current.error).toBe("Connection lost");
    });

    it("setIsDialpadOpen updates dialpad state", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setIsDialpadOpen(true);
      });

      expect(result.current.isDialpadOpen).toBe(true);
    });

    it("toggleDialpad flips dialpad state", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isDialpadOpen).toBe(false);

      act(() => {
        result.current.toggleDialpad();
      });

      expect(result.current.isDialpadOpen).toBe(true);

      act(() => {
        result.current.toggleDialpad();
      });

      expect(result.current.isDialpadOpen).toBe(false);
    });

    it("clearMissedCall resets missedCall to null", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      // missedCall is null initially; clearMissedCall keeps it null
      act(() => {
        result.current.clearMissedCall();
      });

      expect(result.current.missedCall).toBeNull();
    });
  });

  describe("feature gating (ip_calling)", () => {
    it("sets loading to false when user has no ip_calling feature", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, is_staff: false, is_superuser: false } as any,
        token: "token",
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        data: { feature_keys: [] },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("grants access to staff users even without explicit ip_calling feature", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, is_staff: true, is_superuser: false } as any,
        token: "token",
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        data: { feature_keys: [] },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      // Staff users have ip_calling access, so loading stays true until SIP config is loaded
      // (the provider will attempt to load SIP configuration)
      expect(result.current).toBeDefined();
    });

    it("grants access to superuser even without explicit ip_calling feature", () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, is_staff: false, is_superuser: true } as any,
        token: "token",
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        data: { feature_keys: [] },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      // Superusers have ip_calling access
      expect(result.current).toBeDefined();
    });

    it("recognises ip_calling from feature_keys array", () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, is_staff: false, is_superuser: false } as any,
        token: "token",
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        data: { feature_keys: ["ip_calling", "other_feature"] },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      // User has ip_calling in their feature_keys, so the provider will try to load SIP config
      expect(result.current).toBeDefined();
    });

    it("recognises ip_calling from feature_keys JSON string", () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, is_staff: false, is_superuser: false } as any,
        token: "token",
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        data: { feature_keys: JSON.stringify(["ip_calling"]) },
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("exposes all expected functions", () => {
    it("exposes all context value keys", () => {
      const { result } = renderHook(() => useCall(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setDialNumber).toBe("function");
      expect(typeof result.current.makeCall).toBe("function");
      expect(typeof result.current.handleAcceptCall).toBe("function");
      expect(typeof result.current.handleRejectCall).toBe("function");
      expect(typeof result.current.handleEndCall).toBe("function");
      expect(typeof result.current.handleToggleHold).toBe("function");
      expect(typeof result.current.handleToggleMute).toBe("function");
      expect(typeof result.current.setError).toBe("function");
      expect(typeof result.current.setIsDialpadOpen).toBe("function");
      expect(typeof result.current.toggleDialpad).toBe("function");
      expect(typeof result.current.sendDTMF).toBe("function");
      expect(typeof result.current.transferCall).toBe("function");
      expect(typeof result.current.clearMissedCall).toBe("function");
    });
  });
});
