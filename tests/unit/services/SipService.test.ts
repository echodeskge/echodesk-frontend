/**
 * SipService (sip.js wrapper) with sip.js fully mocked.
 *
 * Covers the audit defects B1-B9:
 *   B1 hold is a real re-INVITE (`sessionDescriptionHandlerOptions.hold`) and
 *      the local track is disabled while held
 *   B2 no getUserMedia probe; media errors map to keys
 *   B3 one Registerer, reused; disconnect unregisters before stopping the UA
 *   B4 second INVITE during a call -> 486 + onCallBusyRejected
 *   B5 transport state surfaced; reconnect()
 *   B6 ICE failure terminates the session; exactly one onCallEnded
 *   B7 consultation leg uses AUDIO_CONSTRAINTS; mute/DTMF target the active leg
 *   B8 attended transfer completes with a single onCallEnded('transferred')
 *   B9 URL from wss_url / wss://host:port/path, ICE from config only
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// sip.js mock
// ---------------------------------------------------------------------------

const mockRegisterFn = vi.fn();
const mockUnregisterFn = vi.fn();
const mockStopFn = vi.fn();
const mockStartFn = vi.fn();
const mockTransportConnectFn = vi.fn();
const mockInviteFn = vi.fn();
const mockByeFn = vi.fn();
const mockCancelFn = vi.fn();
const mockAcceptFn = vi.fn();
const mockRejectFn = vi.fn();
const mockReferFn = vi.fn();
const mockInfoFn = vi.fn();
const mockInsertDTMF = vi.fn();

type StateListener = (state: string) => void;

interface MockTrack {
  kind: string;
  enabled: boolean;
}

interface MockSessionShape {
  state: string;
  fire(state: string): void;
  listeners: StateListener[];
  track: MockTrack;
  peerConnection: Record<string, unknown>;
}

const sessions: MockSessionShape[] = [];
const inviters: MockSessionShape[] = [];
const registerers: unknown[] = [];
const userAgents: unknown[] = [];

vi.mock("sip.js", () => {
  class MockEmitter {
    listeners: StateListener[] = [];
    addListener = (cb: StateListener) => {
      this.listeners.push(cb);
    };
    removeListener = (cb: StateListener) => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  class MockTransport {
    connected = false;
    stateChange = new MockEmitter();
    connect = async () => {
      await mockTransportConnectFn();
      this.connected = true;
    };
    isConnected = () => this.connected;
    fire(state: string) {
      this.connected = state === "Connected";
      this.stateChange.listeners.forEach((l) => l(state));
    }
  }

  class MockUserAgent {
    configuration: { uri: { host: string; user: string } };
    options: Record<string, unknown>;
    stateChange = new MockEmitter();
    transport = new MockTransport();
    delegate: Record<string, (...a: unknown[]) => void>;
    constructor(opts: Record<string, unknown>) {
      this.options = opts;
      const uri = opts.uri as { host: string; user: string };
      this.configuration = { uri };
      this.delegate = (opts.delegate ?? {}) as Record<string, (...a: unknown[]) => void>;
      userAgents.push(this);
    }
    start = async () => {
      await mockStartFn();
      this.transport.fire("Connected");
    };
    stop = async () => {
      await mockStopFn();
    };
  }

  class MockSession implements MockSessionShape {
    state = "Initial";
    stateChange = new MockEmitter();
    track: MockTrack = { kind: "audio", enabled: true };
    remoteIdentity: { uri: { user: string }; displayName?: string };
    sessionDescriptionHandler: { peerConnection: Record<string, unknown> };
    peerConnection: Record<string, unknown>;
    bye = async (...a: unknown[]) => {
      await mockByeFn(...a);
      this.fire("Terminated");
    };
    refer = mockReferFn;
    info = mockInfoFn;
    constructor(user = "remote") {
      this.remoteIdentity = { uri: { user } };
      this.peerConnection = {
        getSenders: () => [{ track: this.track, dtmf: { insertDTMF: mockInsertDTMF } }],
        getReceivers: () => [],
        ontrack: null,
        onconnectionstatechange: null,
        oniceconnectionstatechange: null,
        connectionState: "new",
        iceConnectionState: "new",
        currentLocalDescription: { sdp: "v=0\r\na=sendrecv" },
      };
      this.sessionDescriptionHandler = { peerConnection: this.peerConnection };
      sessions.push(this);
    }
    get listeners() {
      return this.stateChange.listeners;
    }
    fire(state: string) {
      this.state = state;
      // copy: listeners remove themselves on Terminated
      [...this.stateChange.listeners].forEach((l) => l(state));
    }
  }

  class MockInviter extends MockSession {
    request = { callId: `out-${sessions.length}` };
    target: { user: string };
    options: Record<string, unknown>;
    constructor(_ua: unknown, target: { user: string }, options: Record<string, unknown> = {}) {
      super(target.user);
      this.target = target;
      this.options = options;
      inviters.push(this);
    }
    invite = async (opts?: Record<string, unknown>) => {
      const res = await mockInviteFn(opts, this);
      if (res === "reject") return;
      // Initial INVITE: sent. Re-INVITE: answered.
      const delegate = (opts?.requestDelegate ?? {}) as { onAccept?: (r: unknown) => void };
      if (opts?.sessionDescriptionHandlerOptions && "hold" in (opts.sessionDescriptionHandlerOptions as object)) {
        delegate.onAccept?.({ message: { statusCode: 200 } });
      } else if (this.state === "Initial") {
        this.fire("Establishing");
      }
    };
    cancel = async () => {
      await mockCancelFn();
      this.fire("Terminated");
    };
  }

  class MockInvitation extends MockSession {
    request: { callId: string; getHeader: (name: string) => string | undefined };
    constructor(user = "+995555000111", headers: Record<string, string> = {}, callId = "in-1") {
      super(user);
      this.state = "Initial";
      this.request = { callId, getHeader: (name: string) => headers[name] };
    }
    accept = async (...a: unknown[]) => {
      await mockAcceptFn(...a);
      this.fire("Established");
    };
    reject = async (...a: unknown[]) => {
      await mockRejectFn(...a);
      this.fire("Terminated");
    };
  }

  class MockRegisterer {
    state = "Initial";
    stateChange = new MockEmitter();
    constructor() {
      registerers.push(this);
    }
    register = async (...a: unknown[]) => {
      await mockRegisterFn(...a);
    };
    unregister = async (...a: unknown[]) => {
      await mockUnregisterFn(...a);
      this.fire("Unregistered");
    };
    fire(state: string) {
      this.state = state;
      this.stateChange.listeners.forEach((l) => l(state));
    }
  }

  class MockURI {
    scheme: string;
    user: string;
    host: string;
    constructor(scheme: string, user: string, host: string) {
      this.scheme = scheme;
      this.user = user;
      this.host = host;
    }
  }

  return {
    UserAgent: MockUserAgent,
    Inviter: MockInviter,
    Invitation: MockInvitation,
    Registerer: MockRegisterer,
    URI: MockURI,
    SessionState: {
      Initial: "Initial",
      Establishing: "Establishing",
      Established: "Established",
      Terminating: "Terminating",
      Terminated: "Terminated",
    },
    RegistererState: {
      Initial: "Initial",
      Registered: "Registered",
      Unregistered: "Unregistered",
      Terminated: "Terminated",
    },
    TransportState: {
      Connecting: "Connecting",
      Connected: "Connected",
      Disconnecting: "Disconnecting",
      Disconnected: "Disconnected",
    },
  };
});

class MockMediaStream {
  tracks: unknown[];
  constructor(tracks: unknown[] = []) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}
globalThis.MediaStream = MockMediaStream as unknown as typeof MediaStream;

vi.mock("@/services/NoiseSuppression", () => ({
  NoiseSuppression: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue(new MockMediaStream()),
    setEnabled: vi.fn(),
    destroy: vi.fn(),
  })),
}));

const mockGetUserMedia = vi.fn().mockResolvedValue(new MockMediaStream());
Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
});

import {
  SipService,
  SipCallError,
  AUDIO_CONSTRAINTS,
  resolveWebSocketUrl,
  resolveIceServers,
  normalizeDialNumber,
  toCallError,
  type SoftphoneConfig,
} from "@/services/SipService";
import { Invitation, UserAgent, Registerer } from "sip.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSipConfig(overrides: Partial<SoftphoneConfig> = {}): SoftphoneConfig {
  return {
    id: 1,
    name: "Test PBX",
    sip_server: "pbx.example.test",
    sip_port: 8089,
    username: "100",
    password: "testpass",
    realm: "pbx.example.test",
    turn_password: "",
    has_password: true,
    has_turn_password: false,
    is_active: true,
    is_default: true,
    user_assignments: [],
    ...overrides,
  };
}

function makeAudioElement(): HTMLAudioElement {
  return {
    srcObject: null,
    autoplay: false,
    controls: false,
    muted: false,
    play: vi.fn().mockResolvedValue(undefined),
  } as unknown as HTMLAudioElement;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = Record<string, any>;

const lastUserAgent = () => userAgents[userAgents.length - 1] as AnyMock;
const lastRegisterer = () => registerers[registerers.length - 1] as AnyMock;
const lastInviter = () => inviters[inviters.length - 1] as AnyMock;

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

async function initRegistered(service: SipService, config = makeSipConfig()) {
  await service.initialize(config);
  lastRegisterer().fire("Registered");
}

function incomingInvitation(user = "+995555000111", headers: Record<string, string> = {}, callId = "in-1") {
  const InvitationCtor = Invitation as unknown as new (u: string, h: Record<string, string>, c: string) => AnyMock;
  return new InvitationCtor(user, headers, callId);
}

async function establishedOutgoing(service: SipService) {
  await initRegistered(service);
  const info = await service.makeCall("101");
  lastInviter().fire("Established");
  return { info, inviter: lastInviter() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SipService", () => {
  let localAudio: HTMLAudioElement;
  let remoteAudio: HTMLAudioElement;
  let service: SipService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterFn.mockResolvedValue(undefined);
    mockUnregisterFn.mockResolvedValue(undefined);
    mockStopFn.mockResolvedValue(undefined);
    mockStartFn.mockResolvedValue(undefined);
    mockTransportConnectFn.mockResolvedValue(undefined);
    mockInviteFn.mockResolvedValue(undefined);
    mockByeFn.mockResolvedValue(undefined);
    mockCancelFn.mockResolvedValue(undefined);
    mockAcceptFn.mockResolvedValue(undefined);
    mockRejectFn.mockResolvedValue(undefined);
    // A REFER the PBX accepts (202); tests override the delegate for rejections.
    mockReferFn.mockImplementation(async (_target: unknown, options?: { requestDelegate?: { onAccept?: () => void } }) => {
      options?.requestDelegate?.onAccept?.();
    });
    mockInfoFn.mockResolvedValue(undefined);
    sessions.length = 0;
    inviters.length = 0;
    registerers.length = 0;
    userAgents.length = 0;

    localAudio = makeAudioElement();
    remoteAudio = makeAudioElement();
    service = new SipService(localAudio, remoteAudio);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Config helpers (B9) ---

  describe("resolveWebSocketUrl()", () => {
    it("uses wss_url from the backend when present", () => {
      expect(resolveWebSocketUrl(makeSipConfig({ wss_url: "wss://pbx.tenant.test:8089/ws" }))).toBe(
        "wss://pbx.tenant.test:8089/ws"
      );
    });

    it("builds wss://host:port/path from the SIP fields otherwise", () => {
      expect(resolveWebSocketUrl(makeSipConfig({ sip_port: 8443, websocket_path: "asterisk/ws" }))).toBe(
        "wss://pbx.example.test:8443/asterisk/ws"
      );
    });

    it("defaults the port to 8089 and the path to /ws", () => {
      expect(resolveWebSocketUrl(makeSipConfig({ sip_port: undefined, websocket_path: undefined }))).toBe(
        "wss://pbx.example.test:8089/ws"
      );
    });

    it("accepts ws:// only for the local development hosts", () => {
      expect(resolveWebSocketUrl(makeSipConfig({ wss_url: "ws://localhost:8088/ws" }))).toBe("ws://localhost:8088/ws");
      expect(resolveWebSocketUrl(makeSipConfig({ wss_url: "ws://127.0.0.1:8088/ws" }))).toBe("ws://127.0.0.1:8088/ws");
      expect(resolveWebSocketUrl(makeSipConfig({ wss_url: "ws://demo.lvh.me:8088/ws" }))).toBe("ws://demo.lvh.me:8088/ws");
      expect(() => resolveWebSocketUrl(makeSipConfig({ wss_url: "ws://pbx.example.test:8088/ws" }))).toThrow(SipCallError);
      try {
        resolveWebSocketUrl(makeSipConfig({ wss_url: "ws://pbx.example.test:8088/ws" }));
      } catch (e) {
        expect((e as SipCallError).key).toBe("insecureTransport");
      }
    });

    it("rejects a missing host with configMissing", () => {
      expect(() => resolveWebSocketUrl(makeSipConfig({ sip_server: "" }))).toThrow(
        expect.objectContaining({ key: "configMissing" })
      );
    });
  });

  describe("resolveIceServers()", () => {
    it("passes ice_servers through verbatim", () => {
      const ice = [
        { urls: "stun:stun.tenant.test:3478" },
        { urls: ["turn:turn.tenant.test:3478?transport=udp"], username: "u", credential: "c" },
      ];
      expect(resolveIceServers(makeSipConfig({ ice_servers: ice }))).toEqual(ice);
    });

    it("falls back to stun_server / turn_server from the config", () => {
      expect(
        resolveIceServers(
          makeSipConfig({ stun_server: "stun:stun.tenant.test", turn_server: "turn:t", turn_username: "u", turn_password: "p" })
        )
      ).toEqual([{ urls: "stun:stun.tenant.test" }, { urls: "turn:t", username: "u", credential: "p" }]);
    });

    it("has no built-in ICE servers", () => {
      expect(resolveIceServers(makeSipConfig())).toEqual([]);
    });
  });

  describe("normalizeDialNumber()", () => {
    it("keeps feature codes and IVR targets intact", () => {
      expect(normalizeDialNumber("*100")).toBe("*100");
      expect(normalizeDialNumber("#1")).toBe("#1");
      expect(normalizeDialNumber("*99")).toBe("*99");
    });

    it("keeps extensions and prefixes Georgian numbers", () => {
      expect(normalizeDialNumber("101")).toBe("101");
      expect(normalizeDialNumber("555 123 456")).toBe("+995555123456");
      expect(normalizeDialNumber("00995555123456")).toBe("+995555123456");
      expect(normalizeDialNumber("+995 (555) 123-456")).toBe("+995555123456");
    });
  });

  describe("toCallError()", () => {
    it("maps media errors to their keys", () => {
      expect(toCallError({ name: "NotAllowedError", message: "" })).toEqual({ key: "micDenied" });
      expect(toCallError({ name: "NotFoundError", message: "" })).toEqual({ key: "micMissing" });
      expect(toCallError(new SipCallError("sip486"))).toEqual({ key: "sip486" });
      expect(toCallError(new Error("x"), "transferFailed")).toEqual({ key: "transferFailed" });
    });
  });

  // --- Emitter ---

  describe("events", () => {
    it("supports several listeners per event and unsubscribe", async () => {
      const a = vi.fn();
      const b = vi.fn();
      const offA = service.on("onRegistered", a);
      service.on("onRegistered", b);

      await initRegistered(service);
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);

      offA();
      lastRegisterer().fire("Registered");
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(2);
    });
  });

  // --- initialize (B9) ---

  describe("initialize()", () => {
    it("configures the UA from the backend config (URL, ICE, realm) with no provider lists", async () => {
      await service.initialize(
        makeSipConfig({
          sip_server: "89.150.1.11",
          realm: "",
          wss_url: "wss://pbx.tenant.test:8089/ws",
          ice_servers: [{ urls: "stun:stun.tenant.test" }],
        })
      );
      const ua = lastUserAgent();
      expect(ua.options.transportOptions.server).toBe("wss://pbx.tenant.test:8089/ws");
      expect(ua.options.uri.host).toBe("89.150.1.11");
      expect(ua.options.sessionDescriptionHandlerFactoryOptions.peerConnectionConfiguration.iceServers).toEqual([
        { urls: "stun:stun.tenant.test" },
      ]);
      expect(ua.options.sessionDescriptionHandlerFactoryOptions.constraints).toEqual({ audio: AUDIO_CONSTRAINTS, video: false });
      expect(JSON.stringify(ua.options)).not.toContain("google");
    });

    it("rejects an insecure transport before creating a UA", async () => {
      await expect(service.initialize(makeSipConfig({ wss_url: "ws://pbx.example.test/ws" }))).rejects.toMatchObject({
        key: "insecureTransport",
      });
      expect(userAgents).toHaveLength(0);
    });

    it("rejects a config without username", async () => {
      await expect(service.initialize(makeSipConfig({ username: "" }))).rejects.toMatchObject({ key: "configMissing" });
    });

    it("wraps a failing start() in initFailed", async () => {
      mockStartFn.mockRejectedValueOnce(new Error("socket"));
      await expect(service.initialize(makeSipConfig())).rejects.toMatchObject({ key: "initFailed" });
    });
  });

  // --- Registerer / transport (B3, B5) ---

  describe("registration", () => {
    it("creates one Registerer and reuses it across register() calls", async () => {
      await initRegistered(service);
      await service.register();
      await service.register();
      expect(registerers).toHaveLength(1);
      expect(mockRegisterFn).toHaveBeenCalledTimes(3);
      expect(service.getRegistrationStatus()).toBe(true);
    });

    it("emits onUnregistered once when the registration drops", async () => {
      const onUnregistered = vi.fn();
      service.on("onUnregistered", onUnregistered);
      await initRegistered(service);
      lastRegisterer().fire("Unregistered");
      lastRegisterer().fire("Unregistered");
      expect(onUnregistered).toHaveBeenCalledTimes(1);
      expect(service.getRegistrationStatus()).toBe(false);
    });

    it("emits onRegistrationFailed with the response code", async () => {
      const onFailed = vi.fn();
      service.on("onRegistrationFailed", onFailed);
      await service.initialize(makeSipConfig());
      const opts = mockRegisterFn.mock.calls[0][0];
      opts.requestDelegate.onReject({ message: { statusCode: 403 } });
      expect(onFailed).toHaveBeenCalledWith({ key: "registrationFailed", params: { code: 403 } });
    });

    it("surfaces transport state and drops registration on disconnect", async () => {
      const onTransport = vi.fn();
      const onUnregistered = vi.fn();
      service.on("onTransportState", onTransport);
      service.on("onUnregistered", onUnregistered);
      await initRegistered(service);
      expect(onTransport).toHaveBeenCalledWith("connected");

      lastUserAgent().transport.fire("Disconnected");
      expect(onTransport).toHaveBeenLastCalledWith("disconnected");
      expect(onUnregistered).toHaveBeenCalledTimes(1);
      expect(service.getRegistrationStatus()).toBe(false);
      expect(service.isTransportConnected()).toBe(false);
    });

    it("reconnect() reconnects the transport and re-registers", async () => {
      await initRegistered(service);
      lastUserAgent().transport.fire("Disconnected");
      mockRegisterFn.mockClear();

      await service.reconnect();
      expect(mockTransportConnectFn).toHaveBeenCalledTimes(1);
      expect(mockRegisterFn).toHaveBeenCalledTimes(1);
      expect(registerers).toHaveLength(1);
    });

    it("reconnect() skips transport.connect() when already connected", async () => {
      await initRegistered(service);
      await service.reconnect();
      expect(mockTransportConnectFn).not.toHaveBeenCalled();
    });

    it("reconnect() without a UA fails with notRegistered", async () => {
      await expect(service.reconnect()).rejects.toMatchObject({ key: "notRegistered" });
    });
  });

  describe("disconnect()", () => {
    it("unregisters, then stops the user agent, and ignores the registerer teardown events", async () => {
      const onUnregistered = vi.fn();
      service.on("onUnregistered", onUnregistered);
      await initRegistered(service);

      const order: string[] = [];
      mockUnregisterFn.mockImplementation(async () => {
        order.push("unregister");
      });
      mockStopFn.mockImplementation(async () => {
        order.push("stop");
      });

      await service.disconnect();
      expect(order).toEqual(["unregister", "stop"]);
      expect(service.getRegistrationStatus()).toBe(false);
      expect(onUnregistered).not.toHaveBeenCalled();
    });

    it("still stops the UA when unregister hangs", async () => {
      vi.useFakeTimers();
      await initRegistered(service);
      mockUnregisterFn.mockImplementation(() => new Promise(() => {}));
      const p = service.disconnect();
      await vi.advanceTimersByTimeAsync(2100);
      await p;
      expect(mockStopFn).toHaveBeenCalledTimes(1);
    });
  });

  // --- makeCall (B2, C6) ---

  describe("makeCall()", () => {
    it("fails with notRegistered before registration", async () => {
      await expect(service.makeCall("101")).rejects.toMatchObject({ key: "notRegistered" });
    });

    it("dials without a getUserMedia probe and returns the SIP Call-ID", async () => {
      await initRegistered(service);
      const info = await service.makeCall("+995 555 123 456");
      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(info).toEqual({ sipCallId: lastInviter().request.callId, number: "+995555123456" });
      expect(lastInviter().target).toMatchObject({ user: "+995555123456", host: "pbx.example.test" });
      expect(lastInviter().options.sessionDescriptionHandlerOptions.constraints).toEqual({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });
    });

    it("dials feature codes verbatim", async () => {
      await initRegistered(service);
      await service.makeCall("*100");
      expect(lastInviter().target.user).toBe("*100");
    });

    it("emits onCallProgress on a provisional response and onCallAccepted when established", async () => {
      const onProgress = vi.fn();
      const onAccepted = vi.fn();
      service.on("onCallProgress", onProgress);
      service.on("onCallAccepted", onAccepted);
      await initRegistered(service);
      await service.makeCall("101");
      expect(onProgress).not.toHaveBeenCalled();
      mockInviteFn.mock.calls[0][0].requestDelegate.onProgress({ message: { statusCode: 180 } });
      expect(onProgress).toHaveBeenCalledTimes(1);
      lastInviter().fire("Established");
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it("maps NotAllowedError from the Inviter to micDenied and emits no onCallEnded", async () => {
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
      mockInviteFn.mockImplementationOnce(async (_o: unknown, inviter: AnyMock) => {
        inviter.fire("Terminated");
        throw err;
      });
      await expect(service.makeCall("101")).rejects.toMatchObject({ key: "micDenied" });
      await flush();
      expect(onEnded).not.toHaveBeenCalled();
      expect(service.getCurrentCallInfo()).toBeNull();
    });

    it("maps NotFoundError to micMissing", async () => {
      await initRegistered(service);
      mockInviteFn.mockRejectedValueOnce(Object.assign(new Error("none"), { name: "NotFoundError" }));
      await expect(service.makeCall("101")).rejects.toMatchObject({ key: "micMissing" });
    });

    it("times out media acquisition with micTimeout and cancels the INVITE", async () => {
      vi.useFakeTimers();
      await initRegistered(service);
      mockInviteFn.mockImplementationOnce(() => new Promise(() => {}));
      const p = service.makeCall("101");
      const assertion = expect(p).rejects.toMatchObject({ key: "micTimeout" });
      await vi.advanceTimersByTimeAsync(15_100);
      await assertion;
      expect(mockCancelFn).toHaveBeenCalledTimes(1);
    });

    it("refuses a second outgoing call while one exists", async () => {
      await initRegistered(service);
      await service.makeCall("101");
      await expect(service.makeCall("102")).rejects.toMatchObject({ key: "callInProgress" });
    });

    it("rejected INVITE: onCallFailed with the SIP key, then exactly one onCallEnded('busy'|'failed')", async () => {
      const onFailed = vi.fn();
      const onEnded = vi.fn();
      service.on("onCallFailed", onFailed);
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      await service.makeCall("101");
      const inviter = lastInviter();
      const delegate = mockInviteFn.mock.calls[0][0].requestDelegate;

      // sip.js transitions to Terminated *before* calling requestDelegate.onReject
      inviter.fire("Terminated");
      delegate.onReject({ message: { statusCode: 486 } });
      await flush();
      expect(onFailed).toHaveBeenCalledWith({ key: "sip486" });
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("busy");

      // a 603 is a plain failure
      await service.makeCall("102");
      lastInviter().fire("Terminated");
      mockInviteFn.mock.calls[1][0].requestDelegate.onReject({ message: { statusCode: 603 } });
      await flush();
      expect(onFailed).toHaveBeenLastCalledWith({ key: "sip603" });
      expect(onEnded).toHaveBeenCalledTimes(2);
      expect(onEnded).toHaveBeenLastCalledWith("failed");
    });

    it.each([480, 408, 487])("a %i rejection is a no-answer: onCallFailed with its key, then onCallEnded('no_answer')", async (code) => {
      const onFailed = vi.fn();
      const onEnded = vi.fn();
      service.on("onCallFailed", onFailed);
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      await service.makeCall("101");
      lastInviter().fire("Terminated");
      mockInviteFn.mock.calls[0][0].requestDelegate.onReject({ message: { statusCode: code } });
      await flush();
      expect(onFailed).toHaveBeenCalledWith({ key: `sip${code}` });
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("no_answer");
    });

    it("the 487 answering our own CANCEL is neither a failure nor a no-answer", async () => {
      const onFailed = vi.fn();
      const onEnded = vi.fn();
      service.on("onCallFailed", onFailed);
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      await service.makeCall("101");
      await service.endCall(); // cancel(): sip.js terminates, then the 487 reaches requestDelegate.onReject
      mockInviteFn.mock.calls[0][0].requestDelegate.onReject({ message: { statusCode: 487 } });
      await flush();
      expect(mockCancelFn).toHaveBeenCalledTimes(1);
      expect(onFailed).not.toHaveBeenCalled();
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("rejected");
    });

    it("the 487 answering the media-timeout CANCEL reports nothing further", async () => {
      vi.useFakeTimers();
      const onFailed = vi.fn();
      service.on("onCallFailed", onFailed);
      await initRegistered(service);
      mockInviteFn.mockImplementationOnce(() => new Promise(() => {}));
      const p = service.makeCall("101");
      const assertion = expect(p).rejects.toMatchObject({ key: "micTimeout" });
      await vi.advanceTimersByTimeAsync(15_100);
      await assertion;
      mockInviteFn.mock.calls[0][0].requestDelegate.onReject({ message: { statusCode: 487 } });
      expect(onFailed).not.toHaveBeenCalled();
    });

    it("unknown SIP codes map to sipOther with the code", async () => {
      const onFailed = vi.fn();
      service.on("onCallFailed", onFailed);
      await initRegistered(service);
      await service.makeCall("101");
      mockInviteFn.mock.calls[0][0].requestDelegate.onReject({ message: { statusCode: 488 } });
      expect(onFailed).toHaveBeenCalledWith({ key: "sipOther", params: { code: 488 } });
    });
  });

  // --- Incoming (B4) ---

  describe("incoming calls", () => {
    it("emits onIncomingCall and getIncomingInfo() exposes sipCallId and pbxCallId", async () => {
      const onIncoming = vi.fn();
      service.on("onIncomingCall", onIncoming);
      await initRegistered(service);
      const invitation = incomingInvitation("+995555000111", { "X-EchoDesk-Call": "1700000000.42" }, "abc@pbx");
      lastUserAgent().delegate.onInvite(invitation);
      expect(onIncoming).toHaveBeenCalledWith(invitation);
      expect(service.getIncomingInfo(invitation as unknown as Invitation)).toEqual({
        number: "+995555000111",
        displayName: undefined,
        sipCallId: "abc@pbx",
        pbxCallId: "1700000000.42",
      });
    });

    it("answers a second INVITE with 486 and emits onCallBusyRejected", async () => {
      const onBusy = vi.fn();
      const onIncoming = vi.fn();
      service.on("onCallBusyRejected", onBusy);
      service.on("onIncomingCall", onIncoming);
      await initRegistered(service);
      const first = incomingInvitation("+995555000111", {}, "first");
      lastUserAgent().delegate.onInvite(first);
      await service.acceptCall();

      const second = incomingInvitation("+995555000222", {}, "second");
      lastUserAgent().delegate.onInvite(second);
      expect(mockRejectFn).toHaveBeenCalledWith({ statusCode: 486 });
      expect(onBusy).toHaveBeenCalledWith(expect.objectContaining({ number: "+995555000222", sipCallId: "second" }));
      expect(onIncoming).toHaveBeenCalledTimes(1);
      expect(service.getCurrentCallInfo()).toMatchObject({ remoteNumber: "+995555000111", direction: "incoming" });
    });

    it("acceptCall() answers with AUDIO_CONSTRAINTS and emits onCallAccepted", async () => {
      const onAccepted = vi.fn();
      service.on("onCallAccepted", onAccepted);
      await initRegistered(service);
      lastUserAgent().delegate.onInvite(incomingInvitation());
      await service.acceptCall();
      expect(mockAcceptFn).toHaveBeenCalledWith({
        sessionDescriptionHandlerOptions: { constraints: { audio: AUDIO_CONSTRAINTS, video: false } },
      });
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it("rejectCall() ends with exactly one onCallEnded('rejected')", async () => {
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      lastUserAgent().delegate.onInvite(incomingInvitation());
      await service.rejectCall();
      await flush();
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("rejected");
      expect(service.getCurrentCallInfo()).toBeNull();
    });

    it("a remote CANCEL while ringing ends with onCallEnded('ended')", async () => {
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      const invitation = incomingInvitation();
      lastUserAgent().delegate.onInvite(invitation);
      invitation.fire("Terminated");
      await flush();
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("ended");
    });

    it("acceptCall()/rejectCall() fail with noIncomingCall without one", async () => {
      await expect(service.acceptCall()).rejects.toMatchObject({ key: "noIncomingCall" });
      await expect(service.rejectCall()).rejects.toMatchObject({ key: "noIncomingCall" });
    });
  });

  // --- Hold (B1) ---

  describe("toggleHold()", () => {
    it("fails with noActiveCall when nothing is established", async () => {
      await expect(service.toggleHold(true)).rejects.toMatchObject({ key: "noActiveCall" });
    });

    it("sends a hold re-INVITE, disables the local track and emits onCallHeld after the answer", async () => {
      const onHeld = vi.fn();
      service.on("onCallHeld", onHeld);
      const { inviter } = await establishedOutgoing(service);

      await service.toggleHold(true);
      const reinvite = mockInviteFn.mock.calls[1][0];
      expect(reinvite.sessionDescriptionHandlerOptions).toEqual({ hold: true });
      expect(reinvite.sessionDescriptionHandlerModifiers).toBeUndefined();
      expect(inviter.track.enabled).toBe(false);
      expect(onHeld).toHaveBeenCalledWith(true);

      await service.toggleHold(false);
      expect(mockInviteFn.mock.calls[2][0].sessionDescriptionHandlerOptions).toEqual({ hold: false });
      expect(inviter.track.enabled).toBe(true);
      expect(onHeld).toHaveBeenLastCalledWith(false);
    });

    it("does not emit onCallHeld when the re-INVITE is rejected", async () => {
      const onHeld = vi.fn();
      service.on("onCallHeld", onHeld);
      const { inviter } = await establishedOutgoing(service);
      mockInviteFn.mockImplementationOnce(async (opts: AnyMock) => {
        opts.requestDelegate.onReject({ message: { statusCode: 488 } });
        return "reject";
      });
      await expect(service.toggleHold(true)).rejects.toMatchObject({ key: "holdFailed" });
      expect(onHeld).not.toHaveBeenCalled();
      expect(inviter.track.enabled).toBe(true);
    });

    it("keeps the track muted across resume", async () => {
      const { inviter } = await establishedOutgoing(service);
      expect(service.toggleMute()).toBe(true);
      await service.toggleHold(true);
      await service.toggleHold(false);
      expect(inviter.track.enabled).toBe(false);
      expect(service.toggleMute()).toBe(false);
      expect(inviter.track.enabled).toBe(true);
    });
  });

  // --- Ending / ICE (B6) ---

  describe("call termination", () => {
    it("endCall() on an established call BYEs and emits one onCallEnded('ended')", async () => {
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await establishedOutgoing(service);
      await service.endCall();
      await flush();
      expect(mockByeFn).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("ended");
    });

    it("endCall() while the outgoing call rings cancels and emits onCallEnded('rejected')", async () => {
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await initRegistered(service);
      await service.makeCall("101");
      await service.endCall();
      await flush();
      expect(mockCancelFn).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("rejected");
    });

    it("ICE failure reports networkFailed, BYEs, and emits exactly one onCallEnded('failed')", async () => {
      const onFailed = vi.fn();
      const onEnded = vi.fn();
      service.on("onCallFailed", onFailed);
      service.on("onCallEnded", onEnded);
      const { inviter } = await establishedOutgoing(service);

      inviter.peerConnection.iceConnectionState = "failed";
      inviter.peerConnection.oniceconnectionstatechange();
      inviter.peerConnection.connectionState = "failed";
      inviter.peerConnection.onconnectionstatechange();
      await flush();

      expect(onFailed).toHaveBeenCalledTimes(1);
      expect(onFailed).toHaveBeenCalledWith({ key: "networkFailed" });
      expect(mockByeFn).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("failed");
    });

    it("ICE disconnected only warns", async () => {
      const onWarn = vi.fn();
      const onEnded = vi.fn();
      service.on("onCallQualityWarning", onWarn);
      service.on("onCallEnded", onEnded);
      const { inviter } = await establishedOutgoing(service);
      inviter.peerConnection.iceConnectionState = "disconnected";
      inviter.peerConnection.oniceconnectionstatechange();
      await flush();
      expect(onWarn).toHaveBeenCalledWith({ key: "networkUnstable" });
      expect(onEnded).not.toHaveBeenCalled();
    });

    it("endCall() without a session is a no-op", async () => {
      await expect(service.endCall()).resolves.toBeUndefined();
    });
  });

  // --- Mute / DTMF (B7) ---

  describe("toggleMute() / sendDTMF()", () => {
    it("return false without a session", () => {
      expect(service.toggleMute()).toBe(false);
      expect(service.sendDTMF("5")).toBe(false);
    });

    it("mute flips the local track of the main leg", async () => {
      const { inviter } = await establishedOutgoing(service);
      expect(service.toggleMute()).toBe(true);
      expect(inviter.track.enabled).toBe(false);
      expect(service.toggleMute()).toBe(false);
      expect(inviter.track.enabled).toBe(true);
    });

    it("sends DTMF through the RTP sender of the established leg", async () => {
      await establishedOutgoing(service);
      expect(service.sendDTMF("5")).toBe(true);
      expect(mockInsertDTMF).toHaveBeenCalledWith("5", 100, 70);
    });

    it("appends to the tones still queued instead of replacing them (fast key presses)", async () => {
      const { inviter } = await establishedOutgoing(service);
      // Chromium plays the first tone for 100 ms; the keys pressed meanwhile sit in toneBuffer.
      const dtmf = { toneBuffer: "", insertDTMF: vi.fn((tones: string) => { dtmf.toneBuffer = tones; }) };
      inviter.peerConnection.getSenders = () => [{ track: inviter.track, dtmf }];
      for (const ch of "2282#") expect(service.sendDTMF(ch)).toBe(true);
      expect(dtmf.insertDTMF.mock.calls.map((c) => c[0])).toEqual(["2", "22", "228", "2282", "2282#"]);
    });

    it("falls back to SIP INFO when the sender has no dtmf", async () => {
      const { inviter } = await establishedOutgoing(service);
      inviter.peerConnection.getSenders = () => [{ track: inviter.track }];
      expect(service.sendDTMF("#")).toBe(true);
      expect(mockInfoFn).toHaveBeenCalledTimes(1);
    });
  });

  // --- Transfers (B7, B8) ---

  describe("transferCall()", () => {
    it("fails with noActiveCall", async () => {
      await expect(service.transferCall("102")).rejects.toMatchObject({ key: "noActiveCall" });
    });

    it("REFERs to the target on the realm and, once accepted, hangs up as transferred", async () => {
      await establishedOutgoing(service);
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      await service.transferCall("102");
      expect(mockReferFn).toHaveBeenCalledWith(
        expect.objectContaining({ user: "102", host: "pbx.example.test" }),
        expect.objectContaining({ requestDelegate: expect.any(Object), onNotify: expect.any(Function) })
      );
      // Asterisk does not BYE the transferor after a blind transfer: we do.
      expect(mockByeFn).toHaveBeenCalledTimes(1);
      await flush();
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("transferred");
    });

    it("acknowledges the REFER progress NOTIFYs", async () => {
      await establishedOutgoing(service);
      const accept = vi.fn().mockResolvedValue(undefined);
      mockReferFn.mockImplementationOnce(async (_t: unknown, options: { onNotify: (n: unknown) => void; requestDelegate: { onAccept: () => void } }) => {
        options.onNotify({ accept });
        options.requestDelegate.onAccept();
      });
      await service.transferCall("102");
      expect(accept).toHaveBeenCalledTimes(1);
    });

    it("a refused REFER rejects with transferFailed and keeps the call", async () => {
      await establishedOutgoing(service);
      const onEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      mockReferFn.mockImplementationOnce(async (_t: unknown, options: { requestDelegate: { onReject: (r: unknown) => void } }) => {
        options.requestDelegate.onReject({ message: { statusCode: 603 } });
      });
      await expect(service.transferCall("102")).rejects.toMatchObject({ key: "transferFailed", params: { code: 603 } });
      expect(mockByeFn).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();
    });

    it("wraps a REFER that cannot be sent in transferFailed", async () => {
      await establishedOutgoing(service);
      mockReferFn.mockRejectedValueOnce(new Error("no"));
      await expect(service.transferCall("102")).rejects.toMatchObject({ key: "transferFailed" });
      expect(mockByeFn).not.toHaveBeenCalled();
    });
  });

  describe("attended transfer", () => {
    it("startConsultation() fails with noActiveCall", async () => {
      await expect(service.startConsultation("102")).rejects.toMatchObject({ key: "noActiveCall" });
    });

    it("holds the main call and dials the consultation leg with AUDIO_CONSTRAINTS; mute/DTMF target it", async () => {
      const onHeld = vi.fn();
      const onAccepted = vi.fn();
      service.on("onCallHeld", onHeld);
      service.on("onConsultationAccepted", onAccepted);
      const { inviter: main } = await establishedOutgoing(service);

      await service.startConsultation("102");
      expect(onHeld).toHaveBeenCalledWith(true);
      expect(inviters).toHaveLength(2);
      const consultation = lastInviter();
      expect(consultation.options.sessionDescriptionHandlerOptions.constraints).toEqual({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });
      expect(service.getActiveLeg()).toBe("main");

      consultation.fire("Established");
      expect(onAccepted).toHaveBeenCalledTimes(1);
      expect(service.hasConsultationSession()).toBe(true);
      expect(service.getActiveLeg()).toBe("consultation");

      expect(service.toggleMute()).toBe(true);
      expect(consultation.track.enabled).toBe(false);
      expect(main.track.enabled).toBe(false); // still held
      mockInsertDTMF.mockClear();
      expect(service.sendDTMF("1")).toBe(true);
      expect(mockInsertDTMF).toHaveBeenCalledWith("1", 100, 70);
    });

    it("a rejected consultation reports onConsultationFailed once and resumes the main call", async () => {
      const onFailed = vi.fn();
      const onEnded = vi.fn();
      service.on("onConsultationFailed", onFailed);
      service.on("onConsultationEnded", onEnded);
      await establishedOutgoing(service);
      await service.startConsultation("102");
      const consultation = lastInviter();
      consultation.fire("Terminated");
      mockInviteFn.mock.calls[2][0].requestDelegate.onReject({ message: { statusCode: 486 } });
      await flush();
      expect(onFailed).toHaveBeenCalledWith({ key: "sip486" });
      expect(onEnded).not.toHaveBeenCalled();
      expect(service.hasConsultationSession()).toBe(false);
      await service.cancelConsultation();
      expect(mockInviteFn.mock.calls.at(-1)?.[0].sessionDescriptionHandlerOptions).toEqual({ hold: false });
    });

    it("completeAttendedTransfer() REFERs the consultation session and ends with one onCallEnded('transferred')", async () => {
      const onEnded = vi.fn();
      const onConsultationEnded = vi.fn();
      service.on("onCallEnded", onEnded);
      service.on("onConsultationEnded", onConsultationEnded);
      const { inviter: main } = await establishedOutgoing(service);
      await service.startConsultation("102");
      const consultation = lastInviter();
      consultation.fire("Established");

      await service.completeAttendedTransfer();
      expect(mockReferFn).toHaveBeenCalledWith(consultation);
      expect(mockByeFn).toHaveBeenCalledTimes(1); // consultation leg only
      await flush();
      expect(onConsultationEnded).not.toHaveBeenCalled();
      expect(onEnded).not.toHaveBeenCalled();

      // Asterisk BYEs the transferor
      main.fire("Terminated");
      await flush();
      expect(onEnded).toHaveBeenCalledTimes(1);
      expect(onEnded).toHaveBeenCalledWith("transferred");
      expect(service.getCurrentCallInfo()).toBeNull();
    });

    it("completeAttendedTransfer() hangs up itself if the PBX never does", async () => {
      vi.useFakeTimers();
      await establishedOutgoing(service);
      await service.startConsultation("102");
      lastInviter().fire("Established");
      await service.completeAttendedTransfer();
      mockByeFn.mockClear();
      await vi.advanceTimersByTimeAsync(10_100);
      expect(mockByeFn).toHaveBeenCalledTimes(1);
    });

    it("completeAttendedTransfer() requires both sessions, established", async () => {
      await expect(service.completeAttendedTransfer()).rejects.toMatchObject({ key: "noConsultation" });
      await establishedOutgoing(service);
      await service.startConsultation("102");
      await expect(service.completeAttendedTransfer()).rejects.toMatchObject({ key: "consultationNotEstablished" });
    });

    it("cancelConsultation() ends the consultation leg silently and resumes the main call", async () => {
      const onHeld = vi.fn();
      const onConsultationEnded = vi.fn();
      service.on("onCallHeld", onHeld);
      service.on("onConsultationEnded", onConsultationEnded);
      const { inviter: main } = await establishedOutgoing(service);
      await service.startConsultation("102");
      lastInviter().fire("Established");

      await service.cancelConsultation();
      await flush();
      expect(mockByeFn).toHaveBeenCalledTimes(1);
      expect(onConsultationEnded).not.toHaveBeenCalled();
      expect(onHeld).toHaveBeenLastCalledWith(false);
      expect(main.track.enabled).toBe(true);
      expect(service.hasConsultationSession()).toBe(false);
      expect(service.getActiveLeg()).toBe("main");
    });

    it("the far end hanging up the consultation emits onConsultationEnded once", async () => {
      const onConsultationEnded = vi.fn();
      service.on("onConsultationEnded", onConsultationEnded);
      await establishedOutgoing(service);
      await service.startConsultation("102");
      const consultation = lastInviter();
      consultation.fire("Established");
      consultation.fire("Terminated");
      await flush();
      expect(onConsultationEnded).toHaveBeenCalledTimes(1);
      expect(service.getActiveLeg()).toBe("main");
    });

    it("endCall() tears down both legs", async () => {
      await establishedOutgoing(service);
      await service.startConsultation("102");
      lastInviter().fire("Established");
      await service.endCall();
      expect(mockByeFn).toHaveBeenCalledTimes(2);
      expect(service.hasConsultationSession()).toBe(false);
      expect(service.getCurrentCallInfo()).toBeNull();
    });
  });

  // --- Misc ---

  describe("noise suppression", () => {
    it("defaults to disabled and can be toggled", () => {
      expect(service.isNoiseSuppressionEnabled()).toBe(false);
      service.setNoiseSuppression(true);
      expect(service.isNoiseSuppressionEnabled()).toBe(true);
      service.setNoiseSuppression(false);
      expect(service.isNoiseSuppressionEnabled()).toBe(false);
    });
  });

  describe("test hook", () => {
    it("is absent unless NEXT_PUBLIC_CALLS_TEST_HOOK=1", () => {
      expect(window.__echodeskSip).toBeUndefined();
    });

    it("exposes local SDP, sender track state and the call state when enabled", async () => {
      vi.stubEnv("NEXT_PUBLIC_CALLS_TEST_HOOK", "1");
      try {
        const hooked = new SipService(makeAudioElement(), makeAudioElement());
        const hook = window.__echodeskSip!;
        expect(hook.getLocalSdp()).toBeNull();
        expect(hook.getSenderTrackEnabled()).toBeNull();
        expect(hook.getState()).toMatchObject({ registered: false, main: null });

        await establishedOutgoing(hooked);
        expect(hook.getLocalSdp()).toContain("a=sendrecv");
        expect(hook.getSenderTrackEnabled()).toBe(true);
        await hooked.toggleHold(true);
        expect(hook.getSenderTrackEnabled()).toBe(false);
        expect(hook.getState()).toMatchObject({ registered: true, main: { held: true, direction: "outgoing" } });
      } finally {
        vi.unstubAllEnvs();
        delete window.__echodeskSip;
      }
    });
  });

  it("exposes the sip.js classes it depends on in the mock", () => {
    expect(UserAgent).toBeDefined();
    expect(Registerer).toBeDefined();
  });
});
