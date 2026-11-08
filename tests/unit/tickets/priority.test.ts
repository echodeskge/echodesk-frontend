/**
 * Priority display map (design D10, plan E17). Imports the real module; this
 * replaces the old ticket-status.test.ts, which tested copy-pasted functions.
 */
import { describe, it, expect } from "vitest";
import { Signal, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import {
  PRIORITY_OPTIONS,
  PRIORITY_VALUES,
  getPriorityStyle,
  isTicketPriority,
} from "@/app/(tenant)/tickets/_lib/priority";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

describe("getPriorityStyle", () => {
  it("critical and high are red with SignalHigh (critical is no longer grey, W38)", () => {
    for (const p of ["critical", "high"]) {
      const s = getPriorityStyle(p);
      expect(s.color).toBe("#dc3545");
      expect(s.bg).toBe("#dc35451a");
      expect(s.icon).toBe(SignalHigh);
    }
  });

  it("medium is orange with SignalMedium", () => {
    const s = getPriorityStyle("medium");
    expect(s.color).toBe("#fd7e14");
    expect(s.icon).toBe(SignalMedium);
  });

  it("low is green with SignalLow", () => {
    const s = getPriorityStyle("low");
    expect(s.color).toBe("#28a745");
    expect(s.icon).toBe(SignalLow);
  });

  it("is case-insensitive", () => {
    expect(getPriorityStyle("HIGH").value).toBe("high");
  });

  it.each(["urgent", "normal", "", null, undefined])("falls back to grey for %s", (p) => {
    const s = getPriorityStyle(p as string | null | undefined);
    expect(s.value).toBeNull();
    expect(s.color).toBe("#6c757d");
    expect(s.icon).toBe(Signal);
    expect(s.rank).toBe(4);
  });

  it("ranks critical < high < medium < low (server priority_rank order)", () => {
    expect(PRIORITY_VALUES.map((p) => getPriorityStyle(p).rank)).toEqual([3, 2, 1, 0]);
  });

  it("points every label key at an existing tickets.* string in en and ka", () => {
    for (const p of [...PRIORITY_VALUES, "bogus"]) {
      const key = getPriorityStyle(p).labelKey;
      for (const messages of [en, ka]) {
        const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages.tickets);
        expect(typeof value, `${key}`).toBe("string");
      }
    }
    expect(getPriorityStyle("critical").labelKey).toBe("priority.critical");
  });
});

describe("priority values", () => {
  it("has no 'urgent' option (E17)", () => {
    expect(PRIORITY_VALUES).not.toContain("urgent");
    expect(PRIORITY_OPTIONS).toEqual(["critical", "high", "medium", "low"]);
  });

  it("isTicketPriority guards backend values only", () => {
    expect(isTicketPriority("critical")).toBe(true);
    expect(isTicketPriority("urgent")).toBe(false);
    expect(isTicketPriority(3)).toBe(false);
  });
});
