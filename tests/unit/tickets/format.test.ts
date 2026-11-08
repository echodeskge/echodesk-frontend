import { describe, it, expect, afterEach } from "vitest";
import {
  dateOnlyToLocalDate,
  formatDateTime,
  formatDuration,
  formatRelative,
  formatShortDate,
  formatTimer,
  normalizeLocale,
  parseDateOnly,
  toDateOnlyString,
} from "@/app/(tenant)/tickets/_lib/format";

const NOW = new Date(2026, 10, 9, 15, 0, 0); // 9 Nov 2026 15:00 local

describe("normalizeLocale", () => {
  it("maps ka variants to ka and everything else to en", () => {
    expect(normalizeLocale("ka")).toBe("ka");
    expect(normalizeLocale("ka-GE")).toBe("ka");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("ru")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });
});

describe("formatShortDate", () => {
  it("writes Georgian month names (Chrome has no ka Intl data)", () => {
    expect(formatShortDate("2026-11-05", "ka", { now: NOW })).toBe("5 ნოე");
  });

  it("writes English month names", () => {
    expect(formatShortDate("2026-11-05", "en", { now: NOW })).toBe("Nov 5");
  });

  it("adds the year when it differs from the current year", () => {
    expect(formatShortDate("2025-01-31", "en", { now: NOW })).toBe("Jan 31, 2025");
    expect(formatShortDate("2025-01-31", "ka", { now: NOW })).toBe("31 იან 2025");
  });

  it("honours year: always / never", () => {
    expect(formatShortDate("2026-03-02", "en", { now: NOW, year: "always" })).toBe("Mar 2, 2026");
    expect(formatShortDate("2025-03-02", "ka", { now: NOW, year: "never" })).toBe("2 მარ");
  });

  it("accepts ISO datetimes and Date objects", () => {
    expect(formatShortDate(new Date(2026, 0, 7, 12), "en", { now: NOW })).toBe("Jan 7");
    expect(formatShortDate(new Date(2026, 11, 24, 9).toISOString(), "ka", { now: NOW })).toBe("24 დეკ");
  });

  it("returns an empty string for missing or invalid input", () => {
    expect(formatShortDate(null, "en")).toBe("");
    expect(formatShortDate("", "en")).toBe("");
    expect(formatShortDate("not a date", "en")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("adds a 24-hour time", () => {
    expect(formatDateTime(new Date(2026, 10, 5, 9, 7), "en", { now: NOW })).toBe("Nov 5, 09:07");
    expect(formatDateTime(new Date(2026, 10, 5, 21, 30), "ka", { now: NOW })).toBe("5 ნოე, 21:30");
  });
});

describe("formatRelative", () => {
  const ago = (ms: number) => new Date(NOW.getTime() - ms);

  it.each([
    ["en", "just now", "5m", "3h", "yesterday", "Nov 1"],
    ["ka", "ახლახან", "5 წთ", "3 სთ", "გუშინ", "1 ნოე"],
  ])("%s: just now, minutes, hours, yesterday, date", (locale, justNow, minutes, hours, yesterday, date) => {
    expect(formatRelative(ago(20_000), locale, NOW)).toBe(justNow);
    expect(formatRelative(ago(5 * 60_000), locale, NOW)).toBe(minutes);
    expect(formatRelative(ago(3 * 3_600_000), locale, NOW)).toBe(hours);
    expect(formatRelative(new Date(2026, 10, 8, 10, 0), locale, NOW)).toBe(yesterday);
    expect(formatRelative(new Date(2026, 10, 1, 10, 0), locale, NOW)).toBe(date);
  });

  it("treats a small future skew as just now", () => {
    expect(formatRelative(new Date(NOW.getTime() + 30_000), "en", NOW)).toBe("just now");
  });

  it("uses yesterday across midnight even when under 24 hours", () => {
    const now = new Date(2026, 10, 9, 1, 0);
    expect(formatRelative(new Date(2026, 10, 8, 23, 0), "en", now)).toBe("yesterday");
  });
});

describe("formatDuration", () => {
  it("formats 3725s as 1h 2m (en) and the Georgian form", () => {
    expect(formatDuration(3725)).toBe("1h 2m");
    expect(formatDuration(3725, "en")).toBe("1h 2m");
    expect(formatDuration(3725, "ka")).toBe("1 სთ 2 წთ");
  });

  it("formats seconds and minutes in Georgian", () => {
    expect(formatDuration(30, "ka")).toBe("30 წმ");
    expect(formatDuration(90, "ka")).toBe("1 წთ 30 წმ");
    expect(formatDuration(7200, "ka")).toBe("2 სთ");
  });

  it("clamps bad input to zero", () => {
    expect(formatDuration(-5)).toBe("0s");
    expect(formatDuration(null)).toBe("0s");
    expect(formatDuration(Number.NaN)).toBe("0s");
  });

  // The cases tests/unit/time-tracking/time-calculations.test.ts asserts for
  // the old TimeTracking formatDuration: the new formatter keeps that format.
  it.each([
    [0, "0s"],
    [1, "1s"],
    [30, "30s"],
    [59, "59s"],
    [60, "1m"],
    [90, "1m 30s"],
    [120, "2m"],
    [125, "2m 5s"],
    [300, "5m"],
    [2700, "45m"],
    [3599, "59m 59s"],
    [3600, "1h"],
    [3660, "1h 1m"],
    [3661, "1h 1m"],
    [5400, "1h 30m"],
    [6000, "1h 40m"],
    [7200, "2h"],
    [9000, "2h 30m"],
    [86400, "24h"],
    [100000, "27h 46m"],
  ])("legacy case %i -> %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatTimer", () => {
  it("formats HH:MM:SS", () => {
    expect(formatTimer(3725)).toBe("01:02:05");
    expect(formatTimer(0)).toBe("00:00:00");
    expect(formatTimer(59)).toBe("00:00:59");
    expect(formatTimer(360000)).toBe("100:00:00");
  });

  it("clamps negatives and bad input to 00:00:00", () => {
    expect(formatTimer(-1)).toBe("00:00:00");
    expect(formatTimer(undefined)).toBe("00:00:00");
  });
});

describe("parseDateOnly", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("returns calendar parts", () => {
    expect(parseDateOnly("2026-11-05")).toEqual({ year: 2026, month: 11, day: 5 });
  });

  it("rejects invalid strings and impossible dates", () => {
    expect(parseDateOnly("2026-11-05T10:00:00Z")).toBeNull();
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
  });

  it("keeps day 5 in a negative-offset timezone (America/Los_Angeles, RM6)", () => {
    process.env.TZ = "America/Los_Angeles";
    // Node re-reads TZ when it changes; make sure the switch took effect so
    // the test can't pass vacuously in a UTC environment.
    expect(new Date(2026, 10, 5).getTimezoneOffset()).toBeGreaterThan(0);
    // The trap this guards against: UTC parsing lands on the 4th here.
    expect(new Date("2026-11-05").getDate()).toBe(4);

    expect(parseDateOnly("2026-11-05")?.day).toBe(5);
    expect(dateOnlyToLocalDate("2026-11-05")?.getDate()).toBe(5);
    expect(formatShortDate("2026-11-05", "en", { now: NOW })).toBe("Nov 5");
    expect(formatShortDate("2026-11-05", "ka", { now: NOW })).toBe("5 ნოე");
  });

  it("round-trips through toDateOnlyString", () => {
    const d = dateOnlyToLocalDate("2026-01-09")!;
    expect(toDateOnlyString(d)).toBe("2026-01-09");
  });
});
