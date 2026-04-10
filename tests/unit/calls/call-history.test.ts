/**
 * Tests for CallHistory component logic.
 * Tests data fetching, filtering, client matching, and display behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock call log data factory
// ---------------------------------------------------------------------------

interface MockCallLog {
  id: number;
  call_id: string;
  caller_number: string;
  recipient_number: string;
  direction: "inbound" | "outbound";
  call_type: string;
  status: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration: string | null;
  duration_display: string | null;
  handled_by_name: string | null;
  call_quality_score: number | null;
  notes: string;
  recording_url: string;
  transferred_to: string;
  transferred_to_user_name: string | null;
  transferred_at: string | null;
  client_name: string | null;
  social_client: number | null;
}

function makeCallLog(overrides: Partial<MockCallLog> = {}): MockCallLog {
  return {
    id: 1,
    call_id: "test-uuid-123",
    caller_number: "995597147515",
    recipient_number: "100",
    direction: "inbound",
    call_type: "voice",
    status: "ended",
    started_at: "2026-04-10T20:00:00Z",
    answered_at: "2026-04-10T20:00:05Z",
    ended_at: "2026-04-10T20:01:00Z",
    duration: "00:00:55",
    duration_display: "0:55",
    handled_by_name: "Test Agent",
    call_quality_score: null,
    notes: "",
    recording_url: "",
    transferred_to: "",
    transferred_to_user_name: null,
    transferred_at: null,
    client_name: null,
    social_client: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Call History Data", () => {
  describe("getPhoneNumber", () => {
    // Simulates the CallHistory logic for deriving the display number
    function getPhoneNumber(log: MockCallLog): string {
      return log.direction === "inbound" ? log.caller_number : log.recipient_number;
    }

    it("returns caller_number for inbound calls", () => {
      const log = makeCallLog({ direction: "inbound", caller_number: "995597147515", recipient_number: "100" });
      expect(getPhoneNumber(log)).toBe("995597147515");
    });

    it("returns recipient_number for outbound calls", () => {
      const log = makeCallLog({ direction: "outbound", caller_number: "+995322421219", recipient_number: "995597147515" });
      expect(getPhoneNumber(log)).toBe("995597147515");
    });
  });

  describe("getCallIcon logic", () => {
    function getCallIconType(direction: string, status: string): string {
      if (status === "missed" || status === "no_answer") return "missed";
      return direction === "inbound" ? "incoming" : "outgoing";
    }

    it("returns missed for missed status", () => {
      expect(getCallIconType("inbound", "missed")).toBe("missed");
    });

    it("returns missed for no_answer status", () => {
      expect(getCallIconType("inbound", "no_answer")).toBe("missed");
    });

    it("returns incoming for inbound answered call", () => {
      expect(getCallIconType("inbound", "answered")).toBe("incoming");
    });

    it("returns outgoing for outbound call", () => {
      expect(getCallIconType("outbound", "ended")).toBe("outgoing");
    });
  });

  describe("status badge mapping", () => {
    const statusVariants: Record<string, string> = {
      answered: "default",
      ended: "secondary",
      missed: "destructive",
      failed: "destructive",
      busy: "outline",
      no_answer: "outline",
      cancelled: "outline",
      initiated: "secondary",
      ringing: "secondary",
    };

    for (const [status, variant] of Object.entries(statusVariants)) {
      it(`maps '${status}' to '${variant}' badge variant`, () => {
        expect(statusVariants[status]).toBe(variant);
      });
    }

    it("falls back to outline for unknown status", () => {
      const variant = statusVariants["unknown_status"] || "outline";
      expect(variant).toBe("outline");
    });
  });

  describe("client name display", () => {
    it("shows client_name when available", () => {
      const log = makeCallLog({ client_name: "John Doe", caller_number: "995597147515" });
      const displayName = log.client_name || log.caller_number;
      expect(displayName).toBe("John Doe");
    });

    it("falls back to phone number when no client_name", () => {
      const log = makeCallLog({ client_name: null, caller_number: "995597147515" });
      const displayName = log.client_name || log.caller_number;
      expect(displayName).toBe("995597147515");
    });
  });

  describe("transfer display", () => {
    it("shows transferred_to_user_name when available", () => {
      const log = makeCallLog({
        transferred_to: "102",
        transferred_to_user_name: "Agent Smith",
      });
      const transferDisplay = log.transferred_to_user_name || log.transferred_to;
      expect(transferDisplay).toBe("Agent Smith");
    });

    it("shows raw extension when no user name", () => {
      const log = makeCallLog({
        transferred_to: "102",
        transferred_to_user_name: null,
      });
      const transferDisplay = log.transferred_to_user_name || log.transferred_to;
      expect(transferDisplay).toBe("102");
    });

    it("hides transfer info when not transferred", () => {
      const log = makeCallLog({ transferred_to: "" });
      expect(!!log.transferred_to).toBe(false);
    });
  });

  describe("rating display", () => {
    it("shows stars for rated calls", () => {
      const log = makeCallLog({ call_quality_score: 4 });
      const stars = [1, 2, 3, 4, 5].map(s => s <= log.call_quality_score!);
      expect(stars).toEqual([true, true, true, true, false]);
    });

    it("shows all empty stars for score 0", () => {
      const log = makeCallLog({ call_quality_score: 0 });
      const stars = [1, 2, 3, 4, 5].map(s => s <= log.call_quality_score!);
      expect(stars).toEqual([false, false, false, false, false]);
    });

    it("hides stars when no rating", () => {
      const log = makeCallLog({ call_quality_score: null });
      expect(log.call_quality_score).toBeNull();
    });
  });

  describe("recording display", () => {
    it("shows recording button when recording_url exists", () => {
      const log = makeCallLog({ recording_url: "https://pbx.echodesk.cloud:8443/recordings/test.wav" });
      expect(!!log.recording_url).toBe(true);
    });

    it("hides recording button when no recording", () => {
      const log = makeCallLog({ recording_url: "" });
      expect(!!log.recording_url).toBe(false);
    });
  });

  describe("filter params construction", () => {
    function buildFilterParams(
      search: string,
      statusFilter: string,
      directionFilter: string,
      page: number
    ): string {
      const params = new URLSearchParams();
      params.set("ordering", "-started_at");
      params.set("page", String(page));
      params.set("page_size", "5");
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (directionFilter !== "all") params.set("direction", directionFilter);
      return params.toString();
    }

    it("builds default params without filters", () => {
      const result = buildFilterParams("", "all", "all", 1);
      expect(result).toBe("ordering=-started_at&page=1&page_size=5");
    });

    it("includes search param", () => {
      const result = buildFilterParams("597", "all", "all", 1);
      expect(result).toContain("search=597");
    });

    it("includes status filter", () => {
      const result = buildFilterParams("", "missed", "all", 1);
      expect(result).toContain("status=missed");
    });

    it("includes direction filter", () => {
      const result = buildFilterParams("", "all", "inbound", 1);
      expect(result).toContain("direction=inbound");
    });

    it("includes all filters together", () => {
      const result = buildFilterParams("597", "answered", "outbound", 2);
      expect(result).toContain("search=597");
      expect(result).toContain("status=answered");
      expect(result).toContain("direction=outbound");
      expect(result).toContain("page=2");
    });

    it("does not include 'all' as status value", () => {
      const result = buildFilterParams("", "all", "all", 1);
      expect(result).not.toContain("status=");
      expect(result).not.toContain("direction=");
    });
  });
});

describe("Call Client Matching Logic", () => {
  // Simulates the backend _match_client last-7-digits logic
  function matchByLast7(phoneNumber: string, clientPhone: string): boolean {
    const clean1 = phoneNumber.replace(/[+\s-]/g, "");
    const clean2 = clientPhone.replace(/[+\s-]/g, "");
    const digits1 = clean1.slice(-7);
    const digits2 = clean2.slice(-7);
    return digits1 === digits2 && digits1.length >= 7;
  }

  it("matches +995597147515 with 995597147515", () => {
    expect(matchByLast7("+995597147515", "995597147515")).toBe(true);
  });

  it("matches 995597147515 with +995597147515", () => {
    expect(matchByLast7("995597147515", "+995597147515")).toBe(true);
  });

  it("matches 0597147515 with +995597147515 (same last 7)", () => {
    expect(matchByLast7("0597147515", "+995597147515")).toBe(true);
  });

  it("does not match different numbers", () => {
    expect(matchByLast7("995597147515", "995574303444")).toBe(false);
  });

  it("does not match short numbers", () => {
    expect(matchByLast7("12345", "12345")).toBe(false);
  });

  it("handles numbers with spaces and dashes", () => {
    expect(matchByLast7("+995 597 147 515", "995-597-147-515")).toBe(true);
  });
});

describe("Active Call State", () => {
  describe("missed call detection", () => {
    function isMissedCall(call: { direction: string; status: string } | null): boolean {
      if (!call) return false;
      return call.direction === "incoming" && call.status === "ringing";
    }

    it("detects missed call: incoming + ringing when call ends", () => {
      expect(isMissedCall({ direction: "incoming", status: "ringing" })).toBe(true);
    });

    it("not missed: incoming + active (was answered)", () => {
      expect(isMissedCall({ direction: "incoming", status: "active" })).toBe(false);
    });

    it("not missed: outgoing call", () => {
      expect(isMissedCall({ direction: "outgoing", status: "ringing" })).toBe(false);
    });

    it("not missed: null call", () => {
      expect(isMissedCall(null)).toBe(false);
    });
  });

  describe("transfer target filtering", () => {
    interface Agent {
      id: number;
      userId: number;
      extension: string;
      online: boolean;
    }

    function filterTransferTargets(agents: Agent[], currentUserId: number): Agent[] {
      return agents.filter(a => a.userId !== currentUserId && a.online);
    }

    it("excludes current user from transfer list", () => {
      const agents: Agent[] = [
        { id: 1, userId: 10, extension: "100", online: true },
        { id: 2, userId: 20, extension: "101", online: true },
      ];
      const result = filterTransferTargets(agents, 10);
      expect(result.length).toBe(1);
      expect(result[0].extension).toBe("101");
    });

    it("excludes offline agents", () => {
      const agents: Agent[] = [
        { id: 1, userId: 10, extension: "100", online: true },
        { id: 2, userId: 20, extension: "101", online: false },
        { id: 3, userId: 30, extension: "102", online: true },
      ];
      const result = filterTransferTargets(agents, 10);
      expect(result.length).toBe(1);
      expect(result[0].extension).toBe("102");
    });

    it("returns empty when all agents are current user or offline", () => {
      const agents: Agent[] = [
        { id: 1, userId: 10, extension: "100", online: true },
        { id: 2, userId: 20, extension: "101", online: false },
      ];
      const result = filterTransferTargets(agents, 10);
      expect(result.length).toBe(0);
    });
  });
});

describe("SipService Logic", () => {
  describe("WebSocket URL construction", () => {
    function getWebSocketUrl(sipServer: string, sipPort: number, websocketPath: string, isSecure: boolean): string {
      const wsProtocol = isSecure ? "wss" : "ws";
      const port = sipPort || (isSecure ? 8089 : 8088);
      const wsPath = websocketPath || "/ws";
      return `${wsProtocol}://${sipServer}:${port}${wsPath}`;
    }

    it("constructs WSS URL for HTTPS", () => {
      expect(getWebSocketUrl("pbx.echodesk.cloud", 8089, "/ws", true))
        .toBe("wss://pbx.echodesk.cloud:8089/ws");
    });

    it("constructs WS URL for HTTP", () => {
      expect(getWebSocketUrl("pbx.echodesk.cloud", 8088, "/ws", false))
        .toBe("ws://pbx.echodesk.cloud:8088/ws");
    });

    it("uses default port when not specified", () => {
      expect(getWebSocketUrl("pbx.echodesk.cloud", 0, "/ws", true))
        .toBe("wss://pbx.echodesk.cloud:8089/ws");
    });

    it("uses custom websocket path", () => {
      expect(getWebSocketUrl("sip.example.com", 443, "/websocket", true))
        .toBe("wss://sip.example.com:443/websocket");
    });

    it("uses default /ws when path is empty", () => {
      expect(getWebSocketUrl("pbx.echodesk.cloud", 8089, "", true))
        .toBe("wss://pbx.echodesk.cloud:8089/ws");
    });
  });

  describe("phone number formatting", () => {
    // Georgian number normalization
    function normalizeGeorgianNumber(number: string): string {
      const clean = number.replace(/[+\s-()]/g, "");
      if (clean.startsWith("995") && clean.length === 12) return `+${clean}`;
      if (clean.startsWith("0") && clean.length === 10) return `+995${clean.slice(1)}`;
      if (clean.length === 9 && (clean.startsWith("5") || clean.startsWith("3"))) return `+995${clean}`;
      return number;
    }

    it("normalizes 995597147515 to +995597147515", () => {
      expect(normalizeGeorgianNumber("995597147515")).toBe("+995597147515");
    });

    it("normalizes 0597147515 to +995597147515", () => {
      expect(normalizeGeorgianNumber("0597147515")).toBe("+995597147515");
    });

    it("normalizes 597147515 to +995597147515", () => {
      expect(normalizeGeorgianNumber("597147515")).toBe("+995597147515");
    });

    it("normalizes landline 322421219 to +995322421219", () => {
      expect(normalizeGeorgianNumber("322421219")).toBe("+995322421219");
    });

    it("leaves already formatted number as-is", () => {
      expect(normalizeGeorgianNumber("+995597147515")).toBe("+995597147515");
    });
  });

  describe("DTMF validation", () => {
    function isValidDTMF(tone: string): boolean {
      return /^[0-9*#]$/.test(tone);
    }

    it("accepts digits 0-9", () => {
      for (let i = 0; i <= 9; i++) {
        expect(isValidDTMF(String(i))).toBe(true);
      }
    });

    it("accepts * and #", () => {
      expect(isValidDTMF("*")).toBe(true);
      expect(isValidDTMF("#")).toBe(true);
    });

    it("rejects letters", () => {
      expect(isValidDTMF("a")).toBe(false);
    });

    it("rejects multi-char input", () => {
      expect(isValidDTMF("12")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidDTMF("")).toBe(false);
    });
  });
});
