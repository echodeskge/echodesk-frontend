/**
 * Tests for time tracking calculation functions from TimeTracking.tsx.
 *
 * Covers:
 * - formatDuration: seconds -> human-readable string ("2h 30m", "45m", "30s")
 * - Total time aggregation from time logs
 */

import { describe, it, expect } from "vitest";
import { formatDuration } from "@/components/TimeTracking";

// ---------------------------------------------------------------------------
// Tests: formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
  describe("seconds only (< 60)", () => {
    it("0 seconds -> '0s'", () => {
      expect(formatDuration(0)).toBe("0s");
    });

    it("1 second -> '1s'", () => {
      expect(formatDuration(1)).toBe("1s");
    });

    it("59 seconds -> '59s'", () => {
      expect(formatDuration(59)).toBe("59s");
    });

    it("30 seconds -> '30s'", () => {
      expect(formatDuration(30)).toBe("30s");
    });
  });

  describe("minutes (60 - 3599)", () => {
    it("60 seconds -> '1m'", () => {
      expect(formatDuration(60)).toBe("1m");
    });

    it("90 seconds -> '1m 30s'", () => {
      expect(formatDuration(90)).toBe("1m 30s");
    });

    it("120 seconds -> '2m'", () => {
      expect(formatDuration(120)).toBe("2m");
    });

    it("300 seconds -> '5m'", () => {
      expect(formatDuration(300)).toBe("5m");
    });

    it("3599 seconds -> '59m 59s'", () => {
      expect(formatDuration(3599)).toBe("59m 59s");
    });

    it("2700 seconds -> '45m'", () => {
      expect(formatDuration(2700)).toBe("45m");
    });

    it("125 seconds -> '2m 5s'", () => {
      expect(formatDuration(125)).toBe("2m 5s");
    });
  });

  describe("hours (>= 3600)", () => {
    it("3600 seconds -> '1h'", () => {
      expect(formatDuration(3600)).toBe("1h");
    });

    it("5400 seconds -> '1h 30m'", () => {
      expect(formatDuration(5400)).toBe("1h 30m");
    });

    it("7200 seconds -> '2h'", () => {
      expect(formatDuration(7200)).toBe("2h");
    });

    it("9000 seconds -> '2h 30m'", () => {
      expect(formatDuration(9000)).toBe("2h 30m");
    });

    it("86400 seconds (24h) -> '24h'", () => {
      expect(formatDuration(86400)).toBe("24h");
    });

    it("3660 seconds -> '1h 1m'", () => {
      expect(formatDuration(3660)).toBe("1h 1m");
    });

    it("3661 seconds -> '1h 1m' (ignores extra seconds in hour display)", () => {
      // The function drops seconds when displaying hours
      expect(formatDuration(3661)).toBe("1h 1m");
    });

    it("large value: 100000 seconds -> '27h 46m'", () => {
      // 100000 / 3600 = 27.77.. hours = 27h and 100000%3600=2800 -> 2800/60=46.67 -> 46m
      expect(formatDuration(100000)).toBe("27h 46m");
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Total time aggregation (logic from TimeTrackingDisplay component)
// ---------------------------------------------------------------------------

describe("Total time aggregation", () => {
  /**
   * Mirrors the aggregation logic inside TimeTrackingDisplay:
   * const totalSeconds = timeLogs
   *   .filter(log => log.duration_seconds)
   *   .reduce((total, log) => total + (log.duration_seconds || 0), 0);
   */
  function calculateTotalTime(
    logs: Array<{ duration_seconds: number | null | undefined }>
  ): number {
    return logs
      .filter((log) => log.duration_seconds)
      .reduce((total, log) => total + (log.duration_seconds || 0), 0);
  }

  it("returns 0 for empty array", () => {
    expect(calculateTotalTime([])).toBe(0);
  });

  it("sums duration_seconds across all logs", () => {
    const logs = [
      { duration_seconds: 3600 },
      { duration_seconds: 1800 },
      { duration_seconds: 900 },
    ];
    expect(calculateTotalTime(logs)).toBe(6300); // 1h 45m
  });

  it("skips logs with null duration_seconds (active sessions)", () => {
    const logs = [
      { duration_seconds: 3600 },
      { duration_seconds: null },   // active session
      { duration_seconds: 1800 },
    ];
    expect(calculateTotalTime(logs)).toBe(5400);
  });

  it("skips logs with undefined duration_seconds", () => {
    const logs = [
      { duration_seconds: 3600 },
      { duration_seconds: undefined },
    ];
    expect(calculateTotalTime(logs)).toBe(3600);
  });

  it("skips logs with 0 duration_seconds", () => {
    const logs = [
      { duration_seconds: 3600 },
      { duration_seconds: 0 },
    ];
    // filter(log => log.duration_seconds) treats 0 as falsy
    expect(calculateTotalTime(logs)).toBe(3600);
  });

  it("single log with duration", () => {
    const logs = [{ duration_seconds: 120 }];
    expect(calculateTotalTime(logs)).toBe(120);
  });

  it("formats aggregated total correctly", () => {
    const logs = [
      { duration_seconds: 3600 },  // 1h
      { duration_seconds: 1800 },  // 30m
      { duration_seconds: 600 },   // 10m
    ];
    const total = calculateTotalTime(logs);
    expect(formatDuration(total)).toBe("1h 40m");
  });
});
