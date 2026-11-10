/**
 * CallContext: default state, hook boundaries, softphone gating, the
 * `useCall()` compatibility shim and the rail rules while idle.
 * Interaction flows with the SIP service live in CallContext.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockHasFeature = vi.fn(() => false);
vi.mock("@/contexts/SubscriptionContext", () => ({
  useSubscription: () => ({ hasFeature: mockHasFeature, subscription: null, loading: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null, token: null, isAuthenticated: false, loading: false })),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `calls.errors.${key}:${JSON.stringify(params)}` : `calls.errors.${key}`,
}));

const mockMyConfig = vi.fn();
vi.mock("@/api/generated/api", () => ({
  sipConfigurationsList: vi.fn(),
  sipConfigurationsWebrtcConfigRetrieve: vi.fn(),
  sipConfigurationsMyConfigRetrieve: (...a: unknown[]) => mockMyConfig(...a),
  callLogsInitiateCallCreate: vi.fn(),
  callLogsLogIncomingCallCreate: vi.fn(),
  callLogsEndCallCreate: vi.fn(),
  callLogsUpdateStatusPartialUpdate: vi.fn(),
  callLogsInitiateConsultationCreate: vi.fn(),
  callLogsCompleteAttendedTransferCreate: vi.fn(),
  callLogsCancelConsultationCreate: vi.fn(),
  callLogsMergeConferenceCreate: vi.fn(),
}));

const mockSipInitialize = vi.fn();
vi.mock("@/services/SipService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/SipService")>();
  return {
    ...actual,
    SipService: vi.fn().mockImplementation(() => ({
      on: vi.fn(() => () => {}),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      initialize: (...a: unknown[]) => mockSipInitialize(...a),
      disconnect: vi.fn().mockResolvedValue(undefined),
      reconnect: vi.fn().mockResolvedValue(undefined),
      makeCall: vi.fn(),
      acceptCall: vi.fn(),
      rejectCall: vi.fn(),
      endCall: vi.fn(),
      toggleHold: vi.fn(),
      toggleMute: vi.fn(),
      sendDTMF: vi.fn(),
      transferCall: vi.fn(),
      getIncomingInfo: vi.fn(),
    })),
  };
});

import { CallProvider, useCall, useCallState, useCallActions } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

const mockUseAuth = vi.mocked(useAuth);
const mockUseUserProfile = vi.mocked(useUserProfile);

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, React.createElement(CallProvider, null, children));
}

function setAuth(user: Record<string, unknown> | null, profile: Record<string, unknown> | null) {
  mockUseAuth.mockReturnValue({ user, token: user ? "t" : null, isAuthenticated: !!user, loading: false } as never);
  mockUseUserProfile.mockReturnValue({ data: profile, isLoading: false, error: null } as never);
}

const useBoth = () => ({ state: useCallState(), actions: useCallActions() });

describe("CallContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasFeature.mockReturnValue(false);
    mockMyConfig.mockResolvedValue({ sip_configuration: null });
    mockSipInitialize.mockResolvedValue(undefined);
    setAuth(null, null);
  });

  describe("hook boundaries", () => {
    it("useCallState / useCallActions / useCall throw outside the provider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useCallState())).toThrow("useCallState must be used within a CallProvider");
      expect(() => renderHook(() => useCallActions())).toThrow("useCallActions must be used within a CallProvider");
      expect(() => renderHook(() => useCall())).toThrow("useCallState must be used within a CallProvider");
      spy.mockRestore();
    });
  });

  describe("default state", () => {
    it("starts idle, off, closed and error-free", async () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      const { state } = result.current;
      expect(state.activeCall).toBeNull();
      expect(state.sipState).toBe("off");
      expect(state.activeSipConfig).toBeNull();
      expect(state.dialNumber).toBe("");
      expect(state.error).toBeNull();
      expect(state.rail).toEqual({ mode: "closed", prefill: null, autoDial: false });
      expect(state.callEndedCounter).toBe(0);
      expect(state.missedCall).toBeNull();
      expect(state.busyRejected).toBeNull();
      expect(state.soundBlocked).toBe(false);
      await waitFor(() => expect(result.current.state.loading).toBe(false));
    });

    it("exposes every action as a stable function", () => {
      const { result, rerender } = renderHook(useBoth, { wrapper: createWrapper() });
      const first = result.current.actions;
      const names = [
        "setDialNumber", "makeCall", "acceptCall", "rejectCall", "endCall", "toggleHold", "toggleMute",
        "sendDTMF", "transferCall", "startAttendedTransfer", "completeTransfer", "cancelTransfer",
        "mergeConference", "openRail", "closeRail", "minimiseRail", "reconnect", "clearMissedCall",
        "clearError", "unlockSound",
      ] as const;
      for (const name of names) expect(typeof first[name]).toBe("function");

      act(() => {
        result.current.actions.setDialNumber("101");
      });
      rerender();
      expect(result.current.actions).toBe(first);
      expect(result.current.state.dialNumber).toBe("101");
    });
  });

  describe("idle actions", () => {
    it("are no-ops without a SIP service", async () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      const a = result.current.actions;
      await act(async () => {
        await a.acceptCall();
        await a.rejectCall();
        await a.endCall();
        await a.toggleHold();
        a.toggleMute();
        await a.completeTransfer();
        await a.cancelTransfer();
        await a.mergeConference();
      });
      expect(a.sendDTMF("5")).toBe(false);
      expect(result.current.state.activeCall).toBeNull();
      expect(result.current.state.error).toBeNull();
    });

    it("makeCall() without registration sets the notRegistered key", async () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      expect(result.current.state.error).toEqual({ key: "notRegistered" });
      expect(result.current.state.activeCall).toBeNull();
    });

    it("makeCall() with an empty number does nothing", async () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await act(async () => {
        await result.current.actions.makeCall();
      });
      expect(result.current.state.error).toBeNull();
    });

    it("transferCall() / startAttendedTransfer() set the error and rethrow", async () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      let thrown: unknown;
      await act(async () => {
        await result.current.actions.transferCall("102").catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toMatchObject({ key: "noActiveCall" });
      expect(result.current.state.error).toEqual({ key: "noActiveCall" });

      thrown = undefined;
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102", "Agent").catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toMatchObject({ key: "noActiveCall" });
    });

    it("clearError() clears and errors auto-clear after 6 s", async () => {
      vi.useFakeTimers();
      try {
        const { result } = renderHook(useBoth, { wrapper: createWrapper() });
        await act(async () => {
          await result.current.actions.makeCall("101");
        });
        expect(result.current.state.error).toEqual({ key: "notRegistered" });
        act(() => {
          vi.advanceTimersByTime(6_100);
        });
        expect(result.current.state.error).toBeNull();

        await act(async () => {
          await result.current.actions.makeCall("101");
        });
        act(() => {
          result.current.actions.clearError();
        });
        expect(result.current.state.error).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("rail rules while idle", () => {
    it("openRail() prefills the dial number; closeRail() closes; minimiseRail() needs a call", () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      act(() => {
        result.current.actions.openRail({ number: " +995 555 000 111 " });
      });
      expect(result.current.state.rail).toEqual({ mode: "open", prefill: "+995 555 000 111", autoDial: false });
      expect(result.current.state.dialNumber).toBe("+995 555 000 111");

      act(() => {
        result.current.actions.minimiseRail();
      });
      expect(result.current.state.rail.mode).toBe("open");

      act(() => {
        result.current.actions.closeRail();
      });
      expect(result.current.state.rail).toEqual({ mode: "closed", prefill: null, autoDial: false });
    });

    it("openRail() without a number keeps the dial field", () => {
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      act(() => {
        result.current.actions.setDialNumber("55");
        result.current.actions.openRail();
      });
      expect(result.current.state.rail.mode).toBe("open");
      expect(result.current.state.dialNumber).toBe("55");
    });
  });

  describe("softphone gating", () => {
    it("does not load a configuration when the tenant lacks ip_calling", async () => {
      mockHasFeature.mockReturnValue(false);
      setAuth({ id: 1, is_staff: true }, { id: 1, feature_keys: ["ip_calling"] });
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.loading).toBe(false));
      expect(mockMyConfig).not.toHaveBeenCalled();
      expect(result.current.state.sipState).toBe("off");
    });

    it("does not load when the user has neither the key nor staff status", async () => {
      mockHasFeature.mockReturnValue(true);
      setAuth({ id: 1 }, { id: 1, feature_keys: [], all_permissions: ["make_calls"] });
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.loading).toBe(false));
      expect(mockMyConfig).not.toHaveBeenCalled();
    });

    it("does not load without the make_calls permission", async () => {
      mockHasFeature.mockReturnValue(true);
      setAuth({ id: 1 }, { id: 1, feature_keys: ["ip_calling"], all_permissions: [] });
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.loading).toBe(false));
      expect(mockMyConfig).not.toHaveBeenCalled();
    });

    it("loads for a user with the key and make_calls", async () => {
      mockHasFeature.mockReturnValue(true);
      setAuth({ id: 1 }, { id: 1, feature_keys: JSON.stringify(["ip_calling"]), all_permissions: ["make_calls"] });
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(mockMyConfig).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.state.loading).toBe(false));
    });

    it("loads for staff without an explicit key", async () => {
      mockHasFeature.mockReturnValue(true);
      setAuth({ id: 1, is_staff: true }, { id: 1, feature_keys: [] });
      renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(mockMyConfig).toHaveBeenCalledTimes(1));
    });
  });

  describe("useCall() compatibility shim", () => {
    it("returns state + actions plus the legacy names", () => {
      const { result } = renderHook(() => useCall(), { wrapper: createWrapper() });
      const v = result.current;
      expect(v.activeCall).toBeNull();
      expect(v.callDuration).toBe(0);
      expect(v.sipRegistered).toBe(false);
      expect(v.sipConnecting).toBe(false);
      expect(v.isDialpadOpen).toBe(false);
      expect(v.error).toBe("");
      expect(v.rail.mode).toBe("closed");
      for (const fn of [
        "setDialNumber", "makeCall", "handleAcceptCall", "handleRejectCall", "handleEndCall", "handleToggleHold",
        "handleToggleMute", "setIsDialpadOpen", "toggleDialpad", "sendDTMF", "transferCall", "startAttendedTransfer",
        "completeTransfer", "cancelTransfer", "mergeConference", "clearMissedCall", "openRail", "closeRail", "reconnect",
      ] as const) {
        expect(typeof v[fn]).toBe("function");
      }
    });

    it("maps the dialpad flags onto the rail and translates the error", async () => {
      const { result } = renderHook(() => useCall(), { wrapper: createWrapper() });
      act(() => {
        result.current.toggleDialpad();
      });
      expect(result.current.isDialpadOpen).toBe(true);
      expect(result.current.rail.mode).toBe("open");
      act(() => {
        result.current.setIsDialpadOpen(false);
      });
      expect(result.current.isDialpadOpen).toBe(false);

      await act(async () => {
        await result.current.makeCall("101");
      });
      expect(result.current.error).toBe("calls.errors.notRegistered");
    });
  });
});
