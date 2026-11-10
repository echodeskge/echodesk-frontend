/**
 * Pure helpers behind the Calls redesign: formatting, tabs → API filters,
 * search normalisation, day grouping, today's summary, agents, plus the
 * dock's FAB-safe spacing contract (CSS variable === JS constant, used by
 * the screens that used to hard-code pr-16).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  callInitials,
  digitsOnly,
  formatCallDay,
  formatMmSs,
  isMissedStatus,
  sanitizeDial,
  statusLabelKey,
} from "@/components/calls/call-format";
import {
  agentsFromAssignments,
  callNumber,
  durationSeconds,
  groupByDay,
  searchParam,
  tabParams,
  todaySummary,
  type CallLogRow,
} from "@/app/(tenant)/calls/_components/calls-utils";
import { DOCK, DOCK_PANEL_RIGHT, FAB_SAFE_RIGHT } from "@/components/TeamChat/floatingDock";
import en from "@/i18n/messages/en.json";

const row = (overrides: Partial<CallLogRow>): CallLogRow => ({
  id: 1,
  caller_number: "+995555000111",
  recipient_number: "100",
  direction: "inbound",
  status: "answered",
  started_at: "2026-11-09T10:00:00",
  answered_at: "2026-11-09T10:00:05",
  duration: "00:01:00",
  handled_by_name: "Ana",
  call_quality_score: null,
  notes: "",
  recording_url: "",
  transferred_to: "",
  transferred_to_user_name: null,
  client_name: null,
  ...overrides,
});

describe("call-format", () => {
  it("formatMmSs", () => {
    expect(formatMmSs(0)).toBe("00:00");
    expect(formatMmSs(125)).toBe("02:05");
    expect(formatMmSs(3725)).toBe("62:05");
    expect(formatMmSs(-3)).toBe("00:00");
    expect(formatMmSs(Number.NaN)).toBe("00:00");
  });

  it("callInitials keeps Georgian as is and uses # for numbers", () => {
    expect(callInitials("john doe")).toBe("JD");
    expect(callInitials("ნინო ბერიძე")).toBe("ნბ");
    expect(callInitials("+995 555 12")).toBe("#");
    expect(callInitials("")).toBe("#");
    expect(callInitials(null)).toBe("#");
  });

  it("sanitizeDial / digitsOnly", () => {
    expect(sanitizeDial("+995 (555) a-1*#")).toBe("+995 555 1*#");
    expect(digitsOnly("+995 555-12")).toBe("99555512");
  });

  it("status helpers", () => {
    expect(isMissedStatus("missed")).toBe(true);
    expect(isMissedStatus("no_answer")).toBe(true);
    expect(isMissedStatus("ended")).toBe(false);
    for (const s of ["answered", "missed", "no_answer", "ended", "failed", "busy", "cancelled", "initiated", "ringing", "transferred"]) {
      const key = statusLabelKey(s);
      expect(key && (en.calls.logs as Record<string, string>)[key]).toBeTruthy();
    }
    expect(statusLabelKey("weird")).toBeNull();
  });

  it("formatCallDay writes Georgian names with date-fns (Chrome has no ka Intl data)", () => {
    const d = new Date(2026, 10, 7);
    expect(formatCallDay(d, "en")).toBe("Sat, 7 Nov");
    expect(formatCallDay(d, "ka")).toBe("შაბ, 7 ნოე");
  });
});

describe("calls-utils", () => {
  it("tabParams: missed covers missed + no_answer; in/out filter direction", () => {
    expect(tabParams("all")).toEqual({});
    expect(tabParams("missed")).toEqual({ status__in: "missed,no_answer" });
    expect(tabParams("incoming")).toEqual({ direction: "inbound" });
    expect(tabParams("outgoing")).toEqual({ direction: "outbound" });
  });

  it("searchParam strips whitespace from numbers only", () => {
    expect(searchParam("  +995 555 (12) ")).toBe("+99555512");
    expect(searchParam("  Nino Beridze ")).toBe("Nino Beridze");
    expect(searchParam("   ")).toBe("");
  });

  it("callNumber is the other party", () => {
    expect(callNumber(row({ direction: "inbound", caller_number: "A", recipient_number: "B" }))).toBe("A");
    expect(callNumber(row({ direction: "outbound", caller_number: "A", recipient_number: "B" }))).toBe("B");
  });

  it("durationSeconds parses DRF durations", () => {
    expect(durationSeconds("00:01:05")).toBe(65);
    expect(durationSeconds("1 02:00:00")).toBe(93600);
    expect(durationSeconds("05:30")).toBe(330);
    expect(durationSeconds(null)).toBe(0);
    expect(durationSeconds("abc")).toBe(0);
  });

  it("groupByDay buckets newest-first rows into today / yesterday / dates", () => {
    const now = new Date(2026, 10, 9, 15, 0);
    const days = groupByDay(
      [
        row({ id: 1, started_at: new Date(2026, 10, 9, 11).toISOString() }),
        row({ id: 2, started_at: new Date(2026, 10, 9, 9).toISOString() }),
        row({ id: 3, started_at: new Date(2026, 10, 8, 20).toISOString() }),
        row({ id: 4, started_at: new Date(2026, 10, 5, 8).toISOString() }),
      ],
      now
    );
    expect(days.map((d) => [d.kind, d.items.map((i) => i.id)])).toEqual([
      ["today", [1, 2]],
      ["yesterday", [3]],
      ["date", [4]],
    ]);
  });

  it("todaySummary: total, missed and the average of today's answered calls", () => {
    const now = new Date(2026, 10, 9, 15, 0);
    const today = (h: number) => new Date(2026, 10, 9, h).toISOString();
    expect(
      todaySummary(
        [
          row({ started_at: today(9), duration: "00:02:00" }),
          row({ started_at: today(10), duration: "00:04:00" }),
          row({ started_at: today(11), status: "missed", duration: null, answered_at: null }),
          row({ started_at: today(12), status: "failed", duration: null, answered_at: null }),
          row({ started_at: new Date(2026, 10, 8, 9).toISOString(), duration: "01:00:00" }),
        ],
        now
      )
    ).toEqual({ total: 4, missed: 1, avgSeconds: 180 });
    expect(todaySummary([], now)).toEqual({ total: 0, missed: 0, avgSeconds: 0 });
  });

  it("agentsFromAssignments dedupes users and sorts by name", () => {
    expect(
      agentsFromAssignments([
        { user: 3, user_name: "Luka", extension: "103" },
        { user: 2, user_name: "Ana", extension: "102" },
        { user: 3, user_name: "Luka", extension: "113" },
        { user: null, extension: "199" },
        { user: 4, user_name: "", extension: "104" },
      ])
    ).toEqual([
      { id: 2, name: "Ana" },
      { id: 4, name: "Ext 104" },
      { id: 3, name: "Luka" },
    ]);
  });

  it("agentsFromAssignments names a nameless user with the caller's (translated) extension label", () => {
    expect(
      agentsFromAssignments([{ user: 4, user_name: null, extension: "104" }], (ext) => `შიდა ${ext}`)
    ).toEqual([{ id: 4, name: "შიდა 104" }]);
  });
});

describe("FAB-safe spacing", () => {
  const root = path.resolve(__dirname, "../../..");
  const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

  it("the CSS variable mirrors the dock column (right + launcher + gap)", () => {
    expect(FAB_SAFE_RIGHT).toBe(DOCK_PANEL_RIGHT);
    expect(FAB_SAFE_RIGHT).toBe(DOCK.RIGHT + DOCK.SLOT_SIZE + DOCK.PANEL_GAP);
    const css = read("src/app/globals.css");
    expect(css).toContain(`--fab-safe-right: ${FAB_SAFE_RIGHT}px;`);
    expect(css).toMatch(/@utility pe-fab-safe \{\s*padding-inline-end: var\(--fab-safe-right\);/);
  });

  it("screens with bottom-right controls use the shared utility, not pr-16 hacks", () => {
    for (const file of [
      "src/app/(tenant)/email/_components/email-composer-form.tsx",
      "src/components/messages-beta/composer/MessagesBetaComposer.tsx",
      "src/app/(tenant)/social/clients/_components/clients-screen.tsx",
      "src/app/(tenant)/calls/_components/call-row.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("pe-fab-safe");
      expect(src, file).not.toMatch(/\b(sm:)?p[re]-16\b/);
    }
  });

  it("the call rail is 320px wide (redesign)", () => {
    expect(DOCK.CALL_RAIL_WIDTH).toBe(320);
  });
});
