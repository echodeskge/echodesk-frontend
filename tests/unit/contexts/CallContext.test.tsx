/**
 * CallContext interaction flows against a mocked SipService.
 *
 * Audit defects covered: C1 incoming call answerable while the log write
 * fails, C2 synchronous activeCallRef (reject -> cancelled only), C3 service
 * ref set before initialize() / disconnect on failure, C4 reload on user
 * change + retries + reconnect, C5 duration isolation, C6 dial first then
 * log, C7 hold state follows onCallHeld, C8 shared AudioContext + soundBlocked,
 * C9 error keys, C10 generated client for my_config and the consultation
 * endpoints, U2 transfer errors surfaced, answered-elsewhere via call events.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, act, waitFor, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockHasFeature = vi.fn(() => true);
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
  useTranslations: () => (key: string) => `calls.errors.${key}`,
}));

// --- SipService mock with a real multi-listener emitter ---
type Handler = (...args: unknown[]) => void;
const sipHandlers = new Map<string, Set<Handler>>();
function sipEmit(event: string, ...args: unknown[]) {
  act(() => {
    sipHandlers.get(event)?.forEach((h) => h(...args));
  });
}

const mockSipInitialize = vi.fn();
const mockSipDisconnect = vi.fn();
const mockSipReconnect = vi.fn();
const mockSipMakeCall = vi.fn();
const mockSipAcceptCall = vi.fn();
const mockSipRejectCall = vi.fn();
const mockSipEndCall = vi.fn();
const mockSipToggleHold = vi.fn();
const mockSipToggleMute = vi.fn();
const mockSipSendDTMF = vi.fn();
const mockSipTransferCall = vi.fn();
const mockSipStartConsultation = vi.fn();
const mockSipCompleteAttendedTransfer = vi.fn();
const mockSipCancelConsultation = vi.fn();
const mockSipGetIncomingInfo = vi.fn();
const sipInstances: unknown[] = [];

vi.mock("@/services/SipService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/SipService")>();
  class MockSipService {
    constructor() {
      sipInstances.push(this);
    }
    on = (event: string, handler: Handler) => {
      let set = sipHandlers.get(event);
      if (!set) {
        set = new Set();
        sipHandlers.set(event, set);
      }
      set.add(handler);
      return () => set!.delete(handler);
    };
    off = (event: string, handler: Handler) => sipHandlers.get(event)?.delete(handler);
    removeAllListeners = () => sipHandlers.clear();
    initialize = (...a: unknown[]) => mockSipInitialize(...a);
    disconnect = (...a: unknown[]) => mockSipDisconnect(...a);
    reconnect = (...a: unknown[]) => mockSipReconnect(...a);
    makeCall = (...a: unknown[]) => mockSipMakeCall(...a);
    acceptCall = (...a: unknown[]) => mockSipAcceptCall(...a);
    rejectCall = (...a: unknown[]) => mockSipRejectCall(...a);
    endCall = (...a: unknown[]) => mockSipEndCall(...a);
    toggleHold = (...a: unknown[]) => mockSipToggleHold(...a);
    toggleMute = (...a: unknown[]) => mockSipToggleMute(...a);
    sendDTMF = (...a: unknown[]) => mockSipSendDTMF(...a);
    transferCall = (...a: unknown[]) => mockSipTransferCall(...a);
    startConsultation = (...a: unknown[]) => mockSipStartConsultation(...a);
    completeAttendedTransfer = (...a: unknown[]) => mockSipCompleteAttendedTransfer(...a);
    cancelConsultation = (...a: unknown[]) => mockSipCancelConsultation(...a);
    getIncomingInfo = (...a: unknown[]) => mockSipGetIncomingInfo(...a);
  }
  return { ...actual, SipService: MockSipService };
});

const mockMyConfig = vi.fn();
const mockSipList = vi.fn();
const mockWebrtcConfig = vi.fn();
const mockInitiateCall = vi.fn();
const mockLogIncoming = vi.fn();
const mockEndCall = vi.fn();
const mockUpdateStatus = vi.fn();
const mockInitiateConsultation = vi.fn();
const mockCompleteTransfer = vi.fn();
const mockCancelConsultation = vi.fn();
const mockMergeConference = vi.fn();

vi.mock("@/api/generated/api", () => ({
  sipConfigurationsList: (...a: unknown[]) => mockSipList(...a),
  sipConfigurationsWebrtcConfigRetrieve: (...a: unknown[]) => mockWebrtcConfig(...a),
  sipConfigurationsMyConfigRetrieve: (...a: unknown[]) => mockMyConfig(...a),
  callLogsInitiateCallCreate: (...a: unknown[]) => mockInitiateCall(...a),
  callLogsLogIncomingCallCreate: (...a: unknown[]) => mockLogIncoming(...a),
  callLogsEndCallCreate: (...a: unknown[]) => mockEndCall(...a),
  callLogsUpdateStatusPartialUpdate: (...a: unknown[]) => mockUpdateStatus(...a),
  callLogsInitiateConsultationCreate: (...a: unknown[]) => mockInitiateConsultation(...a),
  callLogsCompleteAttendedTransferCreate: (...a: unknown[]) => mockCompleteTransfer(...a),
  callLogsCancelConsultationCreate: (...a: unknown[]) => mockCancelConsultation(...a),
  callLogsMergeConferenceCreate: (...a: unknown[]) => mockMergeConference(...a),
}));

import { CallProvider, useCallState, useCallActions } from "@/contexts/CallContext";
import { SipCallError } from "@/services/SipService";
import { useCallDuration } from "@/hooks/useCallDuration";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { publishCallEvent, __resetCallEventsForTests } from "@/lib/call-events";

const mockUseAuth = vi.mocked(useAuth);
const mockUseUserProfile = vi.mocked(useUserProfile);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let queryClient: QueryClient;

function createWrapper() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(CallProvider, null, children));
  Wrapper.displayName = "CallTestWrapper";
  return Wrapper;
}

function setUser(id = 1) {
  mockUseAuth.mockReturnValue({ user: { id, is_staff: true }, token: "t", isAuthenticated: true, loading: false } as never);
  mockUseUserProfile.mockReturnValue({ data: { id, feature_keys: ["ip_calling"] }, isLoading: false, error: null } as never);
}

const SIP_CONFIGURATION = {
  id: 7,
  name: "Local",
  sip_server: "localhost",
  sip_port: 8088,
  username: "",
  password: "",
  realm: "localhost",
  websocket_path: "/ws",
  turn_password: "",
  has_password: false,
  has_turn_password: false,
  user_assignments: [],
  sip_enabled: true,
};

function myConfigResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user: 1,
    sip_configuration: SIP_CONFIGURATION,
    extension: "101",
    extension_password: "secret-ext",
    phone_number: "+995322421219",
    display_name: "Agent",
    is_primary: true,
    is_active: true,
    sip_enabled: true,
    wss_url: "ws://localhost:8088/ws",
    ice_servers: [{ urls: "stun:stun.local" }],
    ...overrides,
  };
}

const INCOMING_INFO = { number: "+995555000111", displayName: undefined, sipCallId: "sip-1", pbxCallId: "pbx-1" };
const INVITATION = { id: "inv-1" };

const useBoth = () => ({ state: useCallState(), actions: useCallActions() });

async function renderRegistered() {
  setUser();
  const utils = renderHook(useBoth, { wrapper: createWrapper() });
  await waitFor(() => expect(mockSipInitialize).toHaveBeenCalledTimes(1));
  sipEmit("onRegistered");
  expect(utils.result.current.state.sipState).toBe("registered");
  return utils;
}

/** Ring in, with the log settled (id 42) unless `logFails`. */
async function ringIn(opts: { logFails?: boolean } = {}) {
  const utils = await renderRegistered();
  if (opts.logFails) mockLogIncoming.mockRejectedValue(new Error("500"));
  sipEmit("onIncomingCall", INVITATION);
  await waitFor(() => expect(utils.result.current.state.activeCall?.logPending).toBe(false));
  return utils;
}

async function answered(utils: Awaited<ReturnType<typeof ringIn>>) {
  await act(async () => {
    await utils.result.current.actions.acceptCall();
  });
  sipEmit("onCallAccepted");
  await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith(42, { status: "answered" }));
  return utils;
}

async function flushLogs() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CallContext flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sipHandlers.clear();
    sipInstances.length = 0;
    __resetCallEventsForTests();
    mockHasFeature.mockReturnValue(true);
    mockMyConfig.mockResolvedValue(myConfigResponse());
    mockSipInitialize.mockResolvedValue(undefined);
    mockSipDisconnect.mockResolvedValue(undefined);
    mockSipReconnect.mockResolvedValue(undefined);
    mockSipMakeCall.mockResolvedValue({ sipCallId: "out-1", number: "101" });
    mockSipAcceptCall.mockResolvedValue(undefined);
    mockSipRejectCall.mockResolvedValue(undefined);
    mockSipEndCall.mockResolvedValue(undefined);
    mockSipToggleHold.mockResolvedValue(undefined);
    mockSipToggleMute.mockReturnValue(true);
    mockSipSendDTMF.mockReturnValue(true);
    mockSipTransferCall.mockResolvedValue(undefined);
    mockSipStartConsultation.mockResolvedValue(undefined);
    mockSipCompleteAttendedTransfer.mockResolvedValue(undefined);
    mockSipCancelConsultation.mockResolvedValue(undefined);
    mockSipGetIncomingInfo.mockReturnValue(INCOMING_INFO);
    mockLogIncoming.mockResolvedValue({ id: 42, call_id: "c-42", client_name: "Nino" });
    mockInitiateCall.mockResolvedValue({ id: 43, call_id: "c-43" });
    mockEndCall.mockResolvedValue({});
    mockUpdateStatus.mockResolvedValue({});
    mockInitiateConsultation.mockResolvedValue({ consultation_log_id: 99 });
    mockCompleteTransfer.mockResolvedValue({});
    mockCancelConsultation.mockResolvedValue({});
    mockMergeConference.mockResolvedValue({});
    mockUseAuth.mockReturnValue({ user: null, token: null, isAuthenticated: false, loading: false } as never);
    mockUseUserProfile.mockReturnValue({ data: null, isLoading: false, error: null } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Configuration (C10, C4) ---

  describe("configuration", () => {
    it("loads my_config through the generated client and passes wss_url / ice_servers to the service", async () => {
      const { result } = await renderRegistered();
      expect(mockMyConfig).toHaveBeenCalledTimes(1);
      expect(mockSipList).not.toHaveBeenCalled();
      expect(mockSipInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "101",
          password: "secret-ext",
          phone_number: "+995322421219",
          wss_url: "ws://localhost:8088/ws",
          ice_servers: [{ urls: "stun:stun.local" }],
          sip_server: "localhost",
        })
      );
      expect(result.current.state.activeSipConfig?.username).toBe("101");
      expect(result.current.state.loading).toBe(false);
    });

    it("skips SIP when my_config says sip_enabled=false", async () => {
      mockMyConfig.mockResolvedValue(myConfigResponse({ sip_enabled: false }));
      setUser();
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.loading).toBe(false));
      expect(mockSipInitialize).not.toHaveBeenCalled();
      expect(result.current.state.sipState).toBe("off");
    });

    it("falls back to the default configuration's webrtc_config when my_config fails", async () => {
      mockMyConfig.mockRejectedValue(new Error("404"));
      mockSipList.mockResolvedValue({ results: [{ id: 3, is_default: false }, { id: 7, is_default: true }] });
      mockWebrtcConfig.mockResolvedValue({ ...SIP_CONFIGURATION, username: "100", password: "p", wss_url: "wss://pbx/ws" });
      setUser();
      renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(mockSipInitialize).toHaveBeenCalledTimes(1));
      expect(mockWebrtcConfig).toHaveBeenCalledWith(7);
      expect(mockSipInitialize).toHaveBeenCalledWith(expect.objectContaining({ username: "100", wss_url: "wss://pbx/ws" }));
    });

    it("reports configMissing when there is no default configuration", async () => {
      mockMyConfig.mockRejectedValue(new Error("404"));
      mockSipList.mockResolvedValue({ results: [] });
      setUser();
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.error).toEqual({ key: "configMissing" }));
      expect(result.current.state.loading).toBe(false);
    });

    it("reports configLoadFailed when everything fails", async () => {
      mockMyConfig.mockRejectedValue(new Error("500"));
      mockSipList.mockRejectedValue(new Error("500"));
      setUser();
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.error).toEqual({ key: "configLoadFailed" }));
    });

    it("reloads the configuration and reconnects when the user changes", async () => {
      const utils = await renderRegistered();
      setUser(2);
      utils.rerender();
      await waitFor(() => expect(mockMyConfig).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mockSipInitialize).toHaveBeenCalledTimes(2));
      expect(mockSipDisconnect).toHaveBeenCalledTimes(1);
      expect(sipInstances).toHaveLength(2);
    });

    it("disconnects on unmount", async () => {
      const utils = await renderRegistered();
      utils.unmount();
      await waitFor(() => expect(mockSipDisconnect).toHaveBeenCalledTimes(1));
    });
  });

  // --- Registration state (C3, C4) ---

  describe("registration", () => {
    it("sets sipState failed + initFailed and disconnects when initialize() throws", async () => {
      mockSipInitialize.mockRejectedValue(new SipCallError("initFailed"));
      setUser();
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.sipState).toBe("failed"));
      expect(result.current.state.error).toEqual({ key: "initFailed" });
      expect(mockSipDisconnect).toHaveBeenCalledTimes(1);

      // reconnect() re-initialises from the stored config
      mockSipInitialize.mockResolvedValue(undefined);
      await act(async () => {
        await result.current.actions.reconnect();
      });
      expect(mockSipInitialize).toHaveBeenCalledTimes(2);
      expect(result.current.state.sipState).toBe("connecting");
    });

    it("surfaces insecureTransport from initialize()", async () => {
      mockSipInitialize.mockRejectedValue(new SipCallError("insecureTransport", { url: "ws://pbx/ws" }));
      setUser();
      const { result } = renderHook(useBoth, { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.state.error).toEqual({ key: "insecureTransport", params: { url: "ws://pbx/ws" } }));
    });

    it("retries after onUnregistered with growing delays, then reports failed", async () => {
      const { result } = await renderRegistered();
      vi.useFakeTimers();
      mockSipReconnect.mockRejectedValue(new Error("down"));

      sipEmit("onUnregistered");
      expect(result.current.state.sipState).toBe("reconnecting");

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(attempt * 5000);
        });
        expect(mockSipReconnect).toHaveBeenCalledTimes(attempt);
      }
      expect(result.current.state.sipState).toBe("failed");
      expect(result.current.state.error).toEqual({ key: "networkFailed" });
    });

    it("registration failures retry three times", async () => {
      const { result } = await renderRegistered();
      vi.useFakeTimers();
      mockSipReconnect.mockRejectedValue(new Error("403"));
      sipEmit("onRegistrationFailed", { key: "registrationFailed", params: { code: 403 } });
      expect(result.current.state.error).toEqual({ key: "registrationFailed", params: { code: 403 } });
      expect(result.current.state.sipState).toBe("reconnecting");
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(attempt * 10000);
        });
      }
      expect(mockSipReconnect).toHaveBeenCalledTimes(3);
      expect(result.current.state.sipState).toBe("failed");
    });

    it("onRegistered clears connection errors and resets the retry counter", async () => {
      const { result } = await renderRegistered();
      sipEmit("onUnregistered");
      sipEmit("onRegistrationFailed", { key: "registrationFailed" });
      expect(result.current.state.error).toEqual({ key: "registrationFailed" });
      sipEmit("onRegistered");
      expect(result.current.state.sipState).toBe("registered");
      expect(result.current.state.error).toBeNull();
    });

    it("reconnect() action reconnects the service", async () => {
      const { result } = await renderRegistered();
      await act(async () => {
        await result.current.actions.reconnect();
      });
      expect(mockSipReconnect).toHaveBeenCalledTimes(1);
      expect(result.current.state.sipState).toBe("connecting");
      sipEmit("onRegistered");
      expect(result.current.state.sipState).toBe("registered");
    });

    it("reconnect() failure sets failed + networkFailed", async () => {
      const { result } = await renderRegistered();
      mockSipReconnect.mockRejectedValue(new Error("no"));
      await act(async () => {
        await result.current.actions.reconnect();
      });
      expect(result.current.state.sipState).toBe("failed");
      expect(result.current.state.error).toEqual({ key: "networkFailed" });
    });

    it("offline/online and visibility drive reconnects", async () => {
      const { result } = await renderRegistered();
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      expect(result.current.state.sipState).toBe("offline");
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(mockSipReconnect).toHaveBeenCalledTimes(1);

      sipEmit("onRegistered");
      sipEmit("onUnregistered");
      expect(result.current.state.sipState).toBe("reconnecting");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(mockSipReconnect).toHaveBeenCalledTimes(2);
    });

    it("transport drop while registered shows reconnecting", async () => {
      const { result } = await renderRegistered();
      sipEmit("onTransportState", "disconnected");
      expect(result.current.state.sipState).toBe("reconnecting");
    });
  });

  // --- Incoming (C1, C2) ---

  describe("incoming calls", () => {
    it("sets the UI state first and logs in the background with sip_call_id / pbx_call_id", async () => {
      let resolveLog: (v: unknown) => void = () => {};
      mockLogIncoming.mockImplementation(() => new Promise((r) => (resolveLog = r)));
      const { result } = await renderRegistered();

      sipEmit("onIncomingCall", INVITATION);
      expect(result.current.state.activeCall).toMatchObject({
        sipCallId: "sip-1",
        pbxCallId: "pbx-1",
        logId: null,
        logPending: true,
        number: "+995555000111",
        direction: "incoming",
        status: "ringing",
        answeredElsewhere: false,
      });
      expect(result.current.state.rail.mode).toBe("open");
      expect(mockLogIncoming).toHaveBeenCalledWith({
        caller_number: "+995555000111",
        recipient_number: "+995322421219",
        direction: "inbound",
        sip_call_id: "sip-1",
        pbx_call_id: "pbx-1",
      });

      await act(async () => {
        resolveLog({ id: 42, client_name: "Nino" });
      });
      await waitFor(() => expect(result.current.state.activeCall?.logId).toBe(42));
      expect(result.current.state.activeCall?.logPending).toBe(false);
      expect(result.current.state.activeCall?.callerName).toBe("Nino");
    });

    it("uses the extension as recipient when the assignment has no phone number", async () => {
      mockMyConfig.mockResolvedValue(myConfigResponse({ phone_number: "" }));
      await renderRegistered();
      sipEmit("onIncomingCall", INVITATION);
      expect(mockLogIncoming).toHaveBeenCalledWith(expect.objectContaining({ recipient_number: "101" }));
    });

    it("remains answerable when the log write fails (C1) and skips the status writes", async () => {
      const { result } = await ringIn({ logFails: true });
      expect(result.current.state.activeCall).toMatchObject({ status: "ringing", logId: null, logPending: false });
      expect(result.current.state.error).toEqual({ key: "logFailed" });

      await act(async () => {
        await result.current.actions.acceptCall();
      });
      expect(mockSipAcceptCall).toHaveBeenCalledTimes(1);
      sipEmit("onCallAccepted");
      expect(result.current.state.activeCall?.status).toBe("active");
      expect(result.current.state.activeCall?.startTime).toBeInstanceOf(Date);

      sipEmit("onCallEnded", "ended");
      await flushLogs();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockEndCall).not.toHaveBeenCalled();
      expect(result.current.state.activeCall).toBeNull();
      expect(result.current.state.callEndedCounter).toBe(1);
    });

    it("queues the answered write until the log settles and keeps the order", async () => {
      let resolveLog: (v: unknown) => void = () => {};
      mockLogIncoming.mockImplementation(() => new Promise((r) => (resolveLog = r)));
      const { result } = await renderRegistered();
      sipEmit("onIncomingCall", INVITATION);
      await act(async () => {
        await result.current.actions.acceptCall();
      });
      sipEmit("onCallAccepted");
      sipEmit("onCallEnded", "ended");
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockEndCall).not.toHaveBeenCalled();

      const order: string[] = [];
      mockUpdateStatus.mockImplementation(async () => {
        order.push("answered");
      });
      mockEndCall.mockImplementation(async () => {
        order.push("end_call");
      });
      await act(async () => {
        resolveLog({ id: 42 });
      });
      await waitFor(() => expect(order).toEqual(["answered", "end_call"]));
      expect(mockUpdateStatus).toHaveBeenCalledWith(42, { status: "answered" });
      expect(mockEndCall).toHaveBeenCalledWith(42, { status: "ended" });
    });

    it("reject -> update_status cancelled only, no missed call, no end_call (C2)", async () => {
      const { result } = await ringIn();
      await act(async () => {
        await result.current.actions.rejectCall();
      });
      expect(mockSipRejectCall).toHaveBeenCalledTimes(1);
      sipEmit("onCallEnded", "rejected");
      await flushLogs();
      expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      expect(mockUpdateStatus).toHaveBeenCalledWith(42, { status: "cancelled" });
      expect(mockEndCall).not.toHaveBeenCalled();
      expect(result.current.state.missedCall).toBeNull();
      expect(result.current.state.activeCall).toBeNull();
    });

    it("remote cancel while ringing -> the leg waits as `ending`; end_call says missed -> missed toast", async () => {
      mockEndCall.mockResolvedValue({ id: 42, status: "missed" });
      const { result } = await ringIn();
      sipEmit("onCallEnded", "ended");
      // No verdict yet: no toast, the call is still there.
      expect(result.current.state.activeCall).toMatchObject({ id: expect.any(String), status: "ending" });
      expect(result.current.state.missedCall).toBeNull();

      await waitFor(() => expect(result.current.state.activeCall).toBeNull());
      expect(mockEndCall).toHaveBeenCalledWith(42, { status: "ended" });
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(result.current.state.missedCall).toMatchObject({ number: "+995555000111" });
      expect(result.current.state.answeredElsewhereNotice).toBeNull();
      expect(result.current.state.callEndedCounter).toBe(1);
      act(() => {
        result.current.actions.clearMissedCall();
      });
      expect(result.current.state.missedCall).toBeNull();
    });

    it("answered call ending -> end_call only", async () => {
      const utils = await answered(await ringIn());
      await act(async () => {
        await utils.result.current.actions.endCall();
      });
      expect(mockSipEndCall).toHaveBeenCalledTimes(1);
      sipEmit("onCallEnded", "ended");
      await flushLogs();
      expect(mockEndCall).toHaveBeenCalledWith(42, { status: "ended" });
      expect(mockUpdateStatus).toHaveBeenCalledTimes(1); // answered only
      expect(utils.result.current.state.missedCall).toBeNull();
    });

    it("acceptCall() failure surfaces the key", async () => {
      const { result } = await ringIn();
      mockSipAcceptCall.mockRejectedValue(new SipCallError("micDenied"));
      await act(async () => {
        await result.current.actions.acceptCall();
      });
      expect(result.current.state.error).toEqual({ key: "micDenied" });
    });

    it("busy-rejected second INVITE records busyRejected + missedCall", async () => {
      const { result } = await answered(await ringIn());
      sipEmit("onCallBusyRejected", { number: "+995555000222", sipCallId: "sip-2" });
      expect(result.current.state.busyRejected).toMatchObject({ number: "+995555000222" });
      expect(result.current.state.missedCall).toMatchObject({ number: "+995555000222" });
      expect(result.current.state.activeCall?.status).toBe("active");
    });
  });

  // --- Outgoing (C6) ---

  describe("outgoing calls", () => {
    it("dials first, then logs; status comes from SIP events only", async () => {
      const order: string[] = [];
      mockSipMakeCall.mockImplementation(async () => {
        order.push("dial");
        // The callee answered before invite() resolved
        sipHandlers.get("onCallProgress")?.forEach((h) => h());
        sipHandlers.get("onCallAccepted")?.forEach((h) => h());
        return { sipCallId: "out-1", number: "101" };
      });
      mockInitiateCall.mockImplementation(async () => {
        order.push("log");
        return { id: 43 };
      });
      const { result } = await renderRegistered();
      act(() => {
        result.current.actions.setDialNumber("101");
      });
      await act(async () => {
        await result.current.actions.makeCall();
      });
      expect(order).toEqual(["dial", "log"]);
      expect(mockSipMakeCall).toHaveBeenCalledWith("101");
      expect(mockInitiateCall).toHaveBeenCalledWith({ recipient_number: "101" });
      expect(result.current.state.activeCall).toMatchObject({ direction: "outgoing", status: "active", sipCallId: "out-1" });
      expect(result.current.state.dialNumber).toBe("");
      expect(result.current.state.rail.mode).toBe("open");
      await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith(43, { status: "answered" }));
    });

    it("moves connecting -> ringing on onCallProgress", async () => {
      const { result } = await renderRegistered();
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      expect(result.current.state.activeCall?.status).toBe("connecting");
      sipEmit("onCallProgress");
      expect(result.current.state.activeCall?.status).toBe("ringing");
    });

    it("does not log when dialling fails and surfaces the key", async () => {
      mockSipMakeCall.mockRejectedValue(new SipCallError("micDenied"));
      const { result } = await renderRegistered();
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      expect(mockInitiateCall).not.toHaveBeenCalled();
      expect(result.current.state.error).toEqual({ key: "micDenied" });
      expect(result.current.state.activeCall).toBeNull();
      expect(result.current.state.callEndedCounter).toBe(1);
    });

    it("refuses to dial during a call", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      expect(mockSipMakeCall).not.toHaveBeenCalled();
      expect(result.current.state.error).toEqual({ key: "callInProgress" });
    });

    it("rejected outgoing call: onCallFailed sets the key, onCallEnded('busy') writes busy once", async () => {
      const { result } = await renderRegistered();
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      await waitFor(() => expect(result.current.state.activeCall?.logId).toBe(43));
      sipEmit("onCallFailed", { key: "sip486" });
      expect(result.current.state.error).toEqual({ key: "sip486" });
      expect(result.current.state.activeCall).not.toBeNull();
      sipEmit("onCallEnded", "busy");
      await flushLogs();
      expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      expect(mockUpdateStatus).toHaveBeenCalledWith(43, { status: "busy" });
      expect(mockEndCall).not.toHaveBeenCalled();
      expect(result.current.state.activeCall).toBeNull();
    });

    it("ICE failure mid-call -> end_call failed; before answer -> update_status failed", async () => {
      const utils = await answered(await ringIn());
      sipEmit("onCallEnded", "failed");
      await flushLogs();
      expect(mockEndCall).toHaveBeenCalledWith(42, { status: "failed" });

      mockEndCall.mockClear();
      mockUpdateStatus.mockClear();
      await act(async () => {
        await utils.result.current.actions.makeCall("102");
      });
      await waitFor(() => expect(utils.result.current.state.activeCall?.logId).toBe(43));
      sipEmit("onCallEnded", "failed");
      await flushLogs();
      expect(mockUpdateStatus).toHaveBeenCalledWith(43, { status: "failed" });
      expect(mockEndCall).not.toHaveBeenCalled();
    });

    it("cancelling our own outgoing call -> update_status cancelled", async () => {
      const { result } = await renderRegistered();
      await act(async () => {
        await result.current.actions.makeCall("101");
      });
      await waitFor(() => expect(result.current.state.activeCall?.logId).toBe(43));
      await act(async () => {
        await result.current.actions.endCall();
      });
      sipEmit("onCallEnded", "rejected");
      await flushLogs();
      expect(mockUpdateStatus).toHaveBeenCalledWith(43, { status: "cancelled" });
      expect(result.current.state.missedCall).toBeNull();
    });

    it("autoDial dials the prefill once the rail opens", async () => {
      const { result } = await renderRegistered();
      act(() => {
        result.current.actions.openRail({ number: "102", autoDial: true });
      });
      await waitFor(() => expect(mockSipMakeCall).toHaveBeenCalledWith("102"));
      expect(result.current.state.rail.autoDial).toBe(false);
    });
  });

  // --- In-call controls (C7) ---

  describe("in-call controls", () => {
    it("hold state follows onCallHeld, not the action", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.toggleHold();
      });
      expect(mockSipToggleHold).toHaveBeenCalledWith(true);
      expect(result.current.state.activeCall?.isOnHold).toBe(false);
      sipEmit("onCallHeld", true);
      expect(result.current.state.activeCall?.isOnHold).toBe(true);
      await act(async () => {
        await result.current.actions.toggleHold();
      });
      expect(mockSipToggleHold).toHaveBeenLastCalledWith(false);
      sipEmit("onCallHeld", false);
      expect(result.current.state.activeCall?.isOnHold).toBe(false);
    });

    it("hold failure surfaces holdFailed and leaves the state", async () => {
      const { result } = await answered(await ringIn());
      mockSipToggleHold.mockRejectedValue(new SipCallError("holdFailed"));
      await act(async () => {
        await result.current.actions.toggleHold();
      });
      expect(result.current.state.error).toEqual({ key: "holdFailed" });
      expect(result.current.state.activeCall?.isOnHold).toBe(false);
    });

    it("hold is ignored while ringing", async () => {
      const { result } = await ringIn();
      await act(async () => {
        await result.current.actions.toggleHold();
      });
      expect(mockSipToggleHold).not.toHaveBeenCalled();
    });

    it("mute mirrors the service's answer and DTMF goes through", async () => {
      const { result } = await answered(await ringIn());
      act(() => {
        result.current.actions.toggleMute();
      });
      expect(result.current.state.activeCall?.isMuted).toBe(true);
      mockSipToggleMute.mockReturnValue(false);
      act(() => {
        result.current.actions.toggleMute();
      });
      expect(result.current.state.activeCall?.isMuted).toBe(false);
      expect(result.current.actions.sendDTMF("7")).toBe(true);
      expect(mockSipSendDTMF).toHaveBeenCalledWith("7");
    });

    it("endCall() marks the call ending until the service confirms", async () => {
      const { result } = await answered(await ringIn());
      let release: () => void = () => {};
      mockSipEndCall.mockImplementation(() => new Promise<void>((r) => (release = r)));
      let done: Promise<void> | undefined;
      act(() => {
        done = result.current.actions.endCall();
      });
      expect(result.current.state.activeCall?.status).toBe("ending");
      await act(async () => {
        release();
        await done;
      });
      sipEmit("onCallEnded", "ended");
      expect(result.current.state.activeCall).toBeNull();
    });

    it("quality warnings surface as errors", async () => {
      const { result } = await answered(await ringIn());
      sipEmit("onCallQualityWarning", { key: "networkUnstable" });
      expect(result.current.state.error).toEqual({ key: "networkUnstable" });
    });
  });

  // --- Transfers (C10, U2) ---

  describe("transfers", () => {
    it("blind transfer failure sets error and rethrows", async () => {
      const { result } = await answered(await ringIn());
      mockSipTransferCall.mockRejectedValue(new Error("refer failed"));
      let thrown: unknown;
      await act(async () => {
        await result.current.actions.transferCall("102").catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toBeInstanceOf(Error);
      expect(result.current.state.error).toEqual({ key: "transferFailed" });
    });

    it("blind transfer succeeds silently", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.transferCall("102");
      });
      expect(mockSipTransferCall).toHaveBeenCalledWith("102");
      expect(result.current.state.error).toBeNull();
    });

    it("attended transfer uses the generated consultation endpoints end to end", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102", "Agent Two");
      });
      expect(mockInitiateConsultation).toHaveBeenCalledWith(42, { target_number: "102" });
      expect(mockSipStartConsultation).toHaveBeenCalledWith("102");
      expect(result.current.state.activeCall).toMatchObject({
        transferPhase: "consulting",
        consultationCall: { targetNumber: "102", targetName: "Agent Two", status: "connecting", logId: 99 },
      });

      sipEmit("onCallHeld", true);
      sipEmit("onConsultationProgress");
      expect(result.current.state.activeCall?.consultationCall?.status).toBe("ringing");
      sipEmit("onConsultationAccepted");
      expect(result.current.state.activeCall?.consultationCall?.status).toBe("active");
      expect(result.current.state.activeCall?.isOnHold).toBe(true);

      await act(async () => {
        await result.current.actions.completeTransfer();
      });
      expect(mockSipCompleteAttendedTransfer).toHaveBeenCalledTimes(1);
      expect(mockCompleteTransfer).toHaveBeenCalledWith(42, { consultation_log_id: 99, target_number: "102" });
      expect(result.current.state.activeCall).toBeNull();
      expect(result.current.state.callEndedCounter).toBe(1);

      // The PBX's BYE arrives afterwards: no further log write
      sipEmit("onCallEnded", "transferred");
      await flushLogs();
      expect(mockEndCall).not.toHaveBeenCalled();
      expect(result.current.state.callEndedCounter).toBe(1);
    });

    it("consultation start failure reverts, sets error and rethrows", async () => {
      const { result } = await answered(await ringIn());
      mockSipStartConsultation.mockRejectedValue(new SipCallError("sip486"));
      let thrown: unknown;
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102").catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toMatchObject({ key: "sip486" });
      expect(result.current.state.error).toEqual({ key: "sip486" });
      expect(result.current.state.activeCall).toMatchObject({ transferPhase: "idle", consultationCall: null });
    });

    it("consultation rejected by the target resets and resumes", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      sipEmit("onConsultationFailed", { key: "consultationRejected" });
      expect(result.current.state.error).toEqual({ key: "consultationRejected" });
      expect(result.current.state.activeCall?.transferPhase).toBe("idle");
      expect(mockSipCancelConsultation).toHaveBeenCalledTimes(1);
    });

    it("target hanging up during consultation resumes the main call", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      sipEmit("onConsultationAccepted");
      sipEmit("onConsultationEnded");
      expect(result.current.state.activeCall?.transferPhase).toBe("idle");
      expect(result.current.state.activeCall?.consultationCall).toBeNull();
      expect(mockSipCancelConsultation).toHaveBeenCalledTimes(1);
    });

    it("cancelTransfer() cancels on both sides", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      await act(async () => {
        await result.current.actions.cancelTransfer();
      });
      expect(mockSipCancelConsultation).toHaveBeenCalledTimes(1);
      expect(mockCancelConsultation).toHaveBeenCalledWith(42, { consultation_log_id: 99 });
      expect(result.current.state.activeCall).toMatchObject({ transferPhase: "idle", consultationCall: null });
    });

    it("completeTransfer() failure sets transferFailed and rethrows", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      mockSipCompleteAttendedTransfer.mockRejectedValue(new SipCallError("consultationNotEstablished"));
      let thrown: unknown;
      await act(async () => {
        await result.current.actions.completeTransfer().catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toMatchObject({ key: "consultationNotEstablished" });
      expect(result.current.state.error).toEqual({ key: "consultationNotEstablished" });
      expect(result.current.state.activeCall).not.toBeNull();
    });

    it("mergeConference() merges on the backend, hangs up and writes no end_call", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      sipEmit("onConsultationAccepted");
      await act(async () => {
        await result.current.actions.mergeConference();
      });
      expect(mockMergeConference).toHaveBeenCalledWith(42, { consultation_log_id: 99 });
      expect(mockSipEndCall).toHaveBeenCalledTimes(1);
      expect(result.current.state.activeCall).toBeNull();
      sipEmit("onCallEnded", "ended");
      await flushLogs();
      expect(mockEndCall).not.toHaveBeenCalled();
    });

    it("mergeConference() failure sets mergeFailed", async () => {
      const { result } = await answered(await ringIn());
      await act(async () => {
        await result.current.actions.startAttendedTransfer("102");
      });
      mockMergeConference.mockRejectedValue(new Error("ami"));
      let thrown: unknown;
      await act(async () => {
        await result.current.actions.mergeConference().catch((e) => {
          thrown = e;
        });
      });
      expect(thrown).toBeInstanceOf(Error);
      expect(result.current.state.error).toEqual({ key: "mergeFailed" });
    });
  });

  // --- Answered elsewhere ---

  describe("call events", () => {
    it("marks the call answered elsewhere on a sibling's answered event and skips missed/end_call", async () => {
      const { result } = await ringIn();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      act(() => {
        publishCallEvent({ id: 77, call_id: "c-77", pbx_call_id: "pbx-1", sip_call_id: "sip-other", status: "answered", handled_by: 2 });
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["calls"] });
      expect(result.current.state.activeCall?.answeredElsewhere).toBe(true);
      expect(result.current.state.activeCall?.status).toBe("ringing");
      expect(result.current.state.answeredElsewhereNotice).toMatchObject({
        callId: result.current.state.activeCall?.id,
        number: "+995555000111",
        handledBy: 2,
      });

      sipEmit("onCallEnded", "ended");
      await flushLogs();
      expect(result.current.state.missedCall).toBeNull();
      expect(mockEndCall).not.toHaveBeenCalled();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(result.current.state.activeCall).toBeNull();
      // The notice outlives the leg.
      expect(result.current.state.answeredElsewhereNotice).toMatchObject({ handledBy: 2 });
    });

    it("treats a cancelled event for our own leg the same way (agent unknown)", async () => {
      const { result } = await ringIn();
      act(() => {
        publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
      });
      expect(result.current.state.activeCall?.answeredElsewhere).toBe(true);
      expect(result.current.state.answeredElsewhereNotice).toMatchObject({ handledBy: null });
    });

    it("the notice clears itself after 3 s", async () => {
      const { result } = await ringIn();
      vi.useFakeTimers();
      act(() => {
        publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
      });
      expect(result.current.state.answeredElsewhereNotice).not.toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_900);
      });
      expect(result.current.state.answeredElsewhereNotice).not.toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(result.current.state.answeredElsewhereNotice).toBeNull();
    });

    // Asterisk CANCELs the losing ringall legs before the winner's browser
    // has PATCHed `answered`, so the loser's leg usually ends first.
    describe("CANCEL before the event (ringall race)", () => {
      it("end_call answers cancelled -> notice, no missed toast, call cleared", async () => {
        mockEndCall.mockResolvedValue({ id: 42, status: "cancelled" });
        const { result } = await ringIn();
        sipEmit("onCallEnded", "ended");
        expect(result.current.state.activeCall?.status).toBe("ending");
        expect(result.current.state.missedCall).toBeNull();

        await waitFor(() => expect(result.current.state.activeCall).toBeNull());
        expect(mockEndCall).toHaveBeenCalledWith(42, { status: "ended" });
        expect(mockUpdateStatus).not.toHaveBeenCalled();
        expect(result.current.state.missedCall).toBeNull();
        expect(result.current.state.answeredElsewhereNotice).toMatchObject({ number: "+995555000111", handledBy: null });
        expect(result.current.state.callEndedCounter).toBe(1);
      });

      it("an event arriving while the verdict is pending wins over a `missed` answer", async () => {
        let resolveEnd: (v: unknown) => void = () => {};
        mockEndCall.mockImplementation(() => new Promise((r) => (resolveEnd = r)));
        const { result } = await ringIn();
        sipEmit("onCallEnded", "ended");
        await waitFor(() => expect(mockEndCall).toHaveBeenCalledTimes(1));
        act(() => {
          publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
        });
        expect(result.current.state.activeCall).toMatchObject({ status: "ending", answeredElsewhere: true });
        await act(async () => {
          resolveEnd({ id: 42, status: "missed" });
        });
        await waitFor(() => expect(result.current.state.activeCall).toBeNull());
        expect(result.current.state.missedCall).toBeNull();
        expect(result.current.state.answeredElsewhereNotice).not.toBeNull();
      });

      it("a late event after a `missed` verdict retracts the toast and shows the notice", async () => {
        mockEndCall.mockResolvedValue({ id: 42, status: "missed" });
        const { result } = await ringIn();
        sipEmit("onCallEnded", "ended");
        await waitFor(() => expect(result.current.state.missedCall).not.toBeNull());
        expect(result.current.state.activeCall).toBeNull();

        act(() => {
          publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
        });
        expect(result.current.state.missedCall).toBeNull();
        expect(result.current.state.answeredElsewhereNotice).toMatchObject({ number: "+995555000111", handledBy: null });
        expect(mockUpdateStatus).not.toHaveBeenCalled();

        // A sibling's `answered` adds the agent without restarting anything.
        act(() => {
          publishCallEvent({ id: 77, call_id: "c-77", pbx_call_id: "pbx-1", sip_call_id: "sip-other", status: "answered", handled_by: 2 });
        });
        expect(result.current.state.answeredElsewhereNotice).toMatchObject({ handledBy: 2 });
      });

      it("does not retract a toast the user already dismissed, nor a different call's", async () => {
        mockEndCall.mockResolvedValue({ id: 42, status: "missed" });
        const { result } = await ringIn();
        sipEmit("onCallEnded", "ended");
        await waitFor(() => expect(result.current.state.missedCall).not.toBeNull());
        act(() => {
          result.current.actions.clearMissedCall();
        });
        sipEmit("onCallBusyRejected", { number: "+995555000222", sipCallId: "sip-2" });
        act(() => {
          publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
        });
        expect(result.current.state.missedCall).toMatchObject({ number: "+995555000222" });
        expect(result.current.state.answeredElsewhereNotice).toMatchObject({ number: "+995555000111" });
      });

      it("ignores a late event once the leg is older than 10 s", async () => {
        mockEndCall.mockResolvedValue({ id: 42, status: "missed" });
        const { result } = await ringIn();
        vi.useFakeTimers();
        sipEmit("onCallEnded", "ended");
        await act(async () => {
          for (let i = 0; i < 20; i += 1) await Promise.resolve();
        });
        expect(result.current.state.missedCall).not.toBeNull();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10_100);
        });
        act(() => {
          publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", status: "cancelled", handled_by: 1 });
        });
        expect(result.current.state.missedCall).not.toBeNull();
        expect(result.current.state.answeredElsewhereNotice).toBeNull();
      });

      it("a leg whose log is still pending waits for the log, then end_calls", async () => {
        let resolveLog: (v: unknown) => void = () => {};
        mockLogIncoming.mockImplementation(() => new Promise((r) => (resolveLog = r)));
        mockEndCall.mockResolvedValue({ id: 42, status: "cancelled" });
        const { result } = await renderRegistered();
        sipEmit("onIncomingCall", INVITATION);
        sipEmit("onCallEnded", "ended");
        expect(result.current.state.activeCall).toMatchObject({ status: "ending", logId: null, logPending: true });
        await flushLogs();
        expect(mockEndCall).not.toHaveBeenCalled();

        await act(async () => {
          resolveLog({ id: 42 });
        });
        await waitFor(() => expect(mockEndCall).toHaveBeenCalledWith(42, { status: "ended" }));
        await waitFor(() => expect(result.current.state.activeCall).toBeNull());
        expect(result.current.state.answeredElsewhereNotice).not.toBeNull();
        expect(result.current.state.missedCall).toBeNull();
      });

      it("a leg whose log failed is cleared as missed without a write", async () => {
        const { result } = await ringIn({ logFails: true });
        sipEmit("onCallEnded", "ended");
        await waitFor(() => expect(result.current.state.activeCall).toBeNull());
        expect(mockEndCall).not.toHaveBeenCalled();
        expect(result.current.state.missedCall).toMatchObject({ number: "+995555000111" });
        expect(result.current.state.callEndedCounter).toBe(1);
      });

      it("end_call failing still clears the leg (as missed)", async () => {
        mockEndCall.mockRejectedValue(new Error("500"));
        const { result } = await ringIn();
        sipEmit("onCallEnded", "ended");
        await waitFor(() => expect(result.current.state.activeCall).toBeNull());
        expect(result.current.state.missedCall).toMatchObject({ number: "+995555000111" });
        expect(result.current.state.answeredElsewhereNotice).toBeNull();
      });

      it("a decline (reject) is never held for a verdict", async () => {
        const { result } = await ringIn();
        await act(async () => {
          await result.current.actions.rejectCall();
        });
        sipEmit("onCallEnded", "rejected");
        expect(result.current.state.activeCall).toBeNull();
        await flushLogs();
        expect(mockEndCall).not.toHaveBeenCalled();
        expect(mockUpdateStatus).toHaveBeenCalledWith(42, { status: "cancelled" });
      });
    });

    it("ignores our own answered event and unrelated calls", async () => {
      const { result } = await ringIn();
      act(() => {
        publishCallEvent({ id: 42, call_id: "c-42", sip_call_id: "sip-1", pbx_call_id: "pbx-1", status: "answered", handled_by: 1 });
        publishCallEvent({ id: 5, call_id: "c-5", sip_call_id: "zzz", pbx_call_id: "other", status: "answered", handled_by: 2 });
      });
      expect(result.current.state.activeCall?.answeredElsewhere).toBe(false);
    });

    it("invalidates the calls queries on every event even when idle", async () => {
      await renderRegistered();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      act(() => {
        publishCallEvent({ id: 1, call_id: "c", status: "ended" });
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["calls"] });
    });
  });

  // --- Rail rules during a call ---

  describe("rail rules during a call", () => {
    it("forces open on ring and on answer, allows minimise, refuses close", async () => {
      const { result } = await renderRegistered();
      act(() => {
        result.current.actions.closeRail();
      });
      expect(result.current.state.rail.mode).toBe("closed");

      sipEmit("onIncomingCall", INVITATION);
      expect(result.current.state.rail.mode).toBe("open");

      act(() => {
        result.current.actions.minimiseRail();
      });
      expect(result.current.state.rail.mode).toBe("minimised");
      act(() => {
        result.current.actions.closeRail();
      });
      expect(result.current.state.rail.mode).toBe("minimised");

      sipEmit("onCallAccepted");
      expect(result.current.state.rail.mode).toBe("open");

      sipEmit("onCallEnded", "ended");
      act(() => {
        result.current.actions.closeRail();
      });
      expect(result.current.state.rail.mode).toBe("closed");
    });
  });

  // --- Duration isolation (C5) ---

  describe("duration isolation", () => {
    it("only the timer component re-renders on the tick", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      setUser();
      let stateRenders = 0;
      let actionsRenders = 0;
      function StateConsumer() {
        stateRenders += 1;
        const { activeCall } = useCallState();
        return <span data-testid="status">{activeCall?.status ?? "idle"}</span>;
      }
      function ActionsConsumer() {
        actionsRenders += 1;
        useCallActions();
        return null;
      }
      function Timer() {
        const { activeCall } = useCallState();
        const seconds = useCallDuration(activeCall?.startTime);
        return <span data-testid="timer">{seconds}</span>;
      }
      render(
        <>
          <StateConsumer />
          <ActionsConsumer />
          <Timer />
        </>,
        { wrapper: createWrapper() }
      );
      await waitFor(() => expect(mockSipInitialize).toHaveBeenCalledTimes(1));
      sipEmit("onRegistered");
      sipEmit("onIncomingCall", INVITATION);
      await waitFor(() => expect(mockLogIncoming).toHaveBeenCalled());
      await flushLogs();
      sipEmit("onCallAccepted");
      expect(screen.getByTestId("status").textContent).toBe("active");

      const before = stateRenders;
      const actionsBefore = actionsRenders;
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(Number(screen.getByTestId("timer").textContent)).toBeGreaterThanOrEqual(3);
      expect(stateRenders).toBe(before);
      expect(actionsRenders).toBe(actionsBefore);
    });
  });

  // --- Sound (C8) ---

  describe("ringtone / autoplay", () => {
    let state: string;
    class FakeAudioContext {
      static instances = 0;
      currentTime = 0;
      destination = {};
      constructor() {
        FakeAudioContext.instances += 1;
      }
      get state() {
        return state;
      }
      resume = vi.fn(async () => {});
      close = vi.fn(async () => {});
      createOscillator = () => ({
        connect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        type: "sine",
        start: vi.fn(),
        stop: vi.fn(),
      });
      createGain = () => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } });
    }

    beforeEach(() => {
      state = "suspended";
      FakeAudioContext.instances = 0;
      vi.stubGlobal("AudioContext", FakeAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("flags soundBlocked while suspended and clears it on unlockSound(); one context across rings", async () => {
      const { result } = await ringIn();
      await waitFor(() => expect(result.current.state.soundBlocked).toBe(true));

      state = "running";
      act(() => {
        result.current.actions.unlockSound();
      });
      await waitFor(() => expect(result.current.state.soundBlocked).toBe(false));

      sipEmit("onCallEnded", "ended");
      sipEmit("onIncomingCall", INVITATION);
      expect(FakeAudioContext.instances).toBe(1);
    });

    it("the first pointer gesture unlocks sound", async () => {
      const { result } = await ringIn();
      await waitFor(() => expect(result.current.state.soundBlocked).toBe(true));
      state = "running";
      act(() => {
        window.dispatchEvent(new Event("pointerdown"));
      });
      await waitFor(() => expect(result.current.state.soundBlocked).toBe(false));
    });
  });
});
