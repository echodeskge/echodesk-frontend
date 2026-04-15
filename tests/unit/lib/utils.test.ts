/**
 * Tests for utility functions in src/lib/utils.ts.
 *
 * Covers:
 * - cn() — Tailwind class name merging
 * - getInitials() — name initial extraction
 * - wait() — async delay
 * - formatDate() / formatDateShort() — date formatting
 * - ensureWithSuffix() — suffix appending
 * - formatUnreadCount() — unread count display
 * - formatFileSize() — human-readable file size
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cn,
  getInitials,
  wait,
  formatDate,
  formatDateShort,
  ensureWithSuffix,
  formatUnreadCount,
  formatFileSize,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tests: cn()
// ---------------------------------------------------------------------------

describe("cn", () => {
  it("merges multiple class names", () => {
    const result = cn("px-2", "py-4");
    expect(result).toBe("px-2 py-4");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("handles undefined and null inputs", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("handles empty string inputs", () => {
    const result = cn("", "base", "");
    expect(result).toBe("base");
  });

  it("handles no arguments", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("merges array inputs via clsx", () => {
    const result = cn(["px-2", "py-4"]);
    expect(result).toBe("px-2 py-4");
  });

  it("handles object syntax for conditional classes", () => {
    const result = cn({ "text-red-500": true, "text-blue-500": false });
    expect(result).toBe("text-red-500");
  });
});

// ---------------------------------------------------------------------------
// Tests: getInitials()
// ---------------------------------------------------------------------------

describe("getInitials", () => {
  it("returns first and last initials for two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns first and last initials for multi-word name", () => {
    expect(getInitials("John Michael Doe")).toBe("JD");
  });

  it("returns first 2 characters for single word", () => {
    expect(getInitials("John")).toBe("JO");
  });

  it("uppercases the result", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it("handles single character name", () => {
    expect(getInitials("J")).toBe("J");
  });

  it("handles name with extra whitespace", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD");
  });

  it("handles lowercase single word", () => {
    expect(getInitials("admin")).toBe("AD");
  });
});

// ---------------------------------------------------------------------------
// Tests: wait()
// ---------------------------------------------------------------------------

describe("wait", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after specified delay", async () => {
    vi.useFakeTimers();
    const promise = wait(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it("uses default delay of 250ms", async () => {
    vi.useFakeTimers();
    const promise = wait();
    vi.advanceTimersByTime(250);
    await expect(promise).resolves.toBeUndefined();
  });

  it("does not resolve before delay", async () => {
    vi.useFakeTimers();
    let resolved = false;
    wait(200).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(100);
    expect(resolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: formatDate()
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats Date object", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    const result = formatDate(date);
    // date-fns "PP" format produces locale-dependent output like "Mar 15, 2024"
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats ISO string", () => {
    const result = formatDate("2024-01-01T00:00:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
  });

  it("formats timestamp number", () => {
    const timestamp = new Date("2024-06-20T00:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });
});

// ---------------------------------------------------------------------------
// Tests: formatDateShort()
// ---------------------------------------------------------------------------

describe("formatDateShort", () => {
  it("formats date in short format", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    const result = formatDateShort(date);
    // "MMM dd" format -> "Mar 15"
    expect(result).toContain("Mar");
    expect(result).toContain("15");
  });

  it("formats ISO string in short format", () => {
    const result = formatDateShort("2024-12-25T00:00:00Z");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });
});

// ---------------------------------------------------------------------------
// Tests: ensureWithSuffix()
// ---------------------------------------------------------------------------

describe("ensureWithSuffix", () => {
  it("adds suffix when not present", () => {
    expect(ensureWithSuffix("path", "/")).toBe("path/");
  });

  it("does not add double suffix", () => {
    expect(ensureWithSuffix("path/", "/")).toBe("path/");
  });

  it("works with multi-character suffix", () => {
    expect(ensureWithSuffix("file", ".txt")).toBe("file.txt");
  });

  it("does not duplicate multi-character suffix", () => {
    expect(ensureWithSuffix("file.txt", ".txt")).toBe("file.txt");
  });

  it("handles empty string value", () => {
    expect(ensureWithSuffix("", "/")).toBe("/");
  });

  it("handles empty suffix", () => {
    expect(ensureWithSuffix("path", "")).toBe("path");
  });
});

// ---------------------------------------------------------------------------
// Tests: formatUnreadCount()
// ---------------------------------------------------------------------------

describe("formatUnreadCount", () => {
  it("returns count for values under 100", () => {
    expect(formatUnreadCount(5)).toBe(5);
  });

  it("returns count for 0", () => {
    expect(formatUnreadCount(0)).toBe(0);
  });

  it("returns count for 99", () => {
    expect(formatUnreadCount(99)).toBe(99);
  });

  it("returns '+99' for exactly 100", () => {
    expect(formatUnreadCount(100)).toBe("+99");
  });

  it("returns '+99' for values over 100", () => {
    expect(formatUnreadCount(500)).toBe("+99");
  });

  it("returns 1 for count of 1", () => {
    expect(formatUnreadCount(1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: formatFileSize()
// ---------------------------------------------------------------------------

describe("formatFileSize", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("formats kilobytes", () => {
    // Uses k=1000 (SI)
    expect(formatFileSize(1000)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1000000)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1000000000)).toBe("1 GB");
  });

  it("formats with decimal precision", () => {
    expect(formatFileSize(1500)).toBe("1.5 KB");
  });

  it("respects custom decimal places", () => {
    expect(formatFileSize(1234, 1)).toBe("1.2 KB");
  });

  it("handles negative decimals as 0", () => {
    expect(formatFileSize(1234, -1)).toBe("1 KB");
  });

  it("formats terabytes", () => {
    expect(formatFileSize(1000000000000)).toBe("1 TB");
  });

  it("formats 1 byte", () => {
    expect(formatFileSize(1)).toBe("1 Bytes");
  });

  it("formats large KB values", () => {
    const result = formatFileSize(999999);
    expect(result).toContain("KB");
  });
});
