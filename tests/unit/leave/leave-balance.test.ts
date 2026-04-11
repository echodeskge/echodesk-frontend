/**
 * Tests for leave balance calculation and display logic.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Balance calculation (mirrors backend available_days property)
// ---------------------------------------------------------------------------

interface LeaveBalance {
  allocated_days: number;
  used_days: number;
  pending_days: number;
  carried_forward_days: number;
}

function calculateAvailableDays(balance: LeaveBalance): number {
  return balance.allocated_days + balance.carried_forward_days - balance.used_days - balance.pending_days;
}

function formatDays(days: number): string {
  if (days === 1) return "1 day";
  return `${days} days`;
}

function getBalanceStatus(available: number, allocated: number): "good" | "warning" | "critical" {
  const ratio = available / allocated;
  if (ratio <= 0) return "critical";
  if (ratio <= 0.2) return "warning";
  return "good";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Leave Balance Calculation", () => {
  it("calculates basic available days", () => {
    const balance: LeaveBalance = { allocated_days: 20, used_days: 0, pending_days: 0, carried_forward_days: 0 };
    expect(calculateAvailableDays(balance)).toBe(20);
  });

  it("subtracts used days", () => {
    const balance: LeaveBalance = { allocated_days: 20, used_days: 5, pending_days: 0, carried_forward_days: 0 };
    expect(calculateAvailableDays(balance)).toBe(15);
  });

  it("subtracts pending days", () => {
    const balance: LeaveBalance = { allocated_days: 20, used_days: 0, pending_days: 3, carried_forward_days: 0 };
    expect(calculateAvailableDays(balance)).toBe(17);
  });

  it("adds carried forward days", () => {
    const balance: LeaveBalance = { allocated_days: 20, used_days: 0, pending_days: 0, carried_forward_days: 5 };
    expect(calculateAvailableDays(balance)).toBe(25);
  });

  it("handles all fields combined", () => {
    const balance: LeaveBalance = { allocated_days: 20, used_days: 8, pending_days: 3, carried_forward_days: 5 };
    // 20 + 5 - 8 - 3 = 14
    expect(calculateAvailableDays(balance)).toBe(14);
  });

  it("can go negative", () => {
    const balance: LeaveBalance = { allocated_days: 10, used_days: 12, pending_days: 0, carried_forward_days: 0 };
    expect(calculateAvailableDays(balance)).toBe(-2);
  });

  it("zero allocated means only carry forward available", () => {
    const balance: LeaveBalance = { allocated_days: 0, used_days: 0, pending_days: 0, carried_forward_days: 3 };
    expect(calculateAvailableDays(balance)).toBe(3);
  });
});

describe("Leave Balance Display", () => {
  it("formats 1 day correctly", () => {
    expect(formatDays(1)).toBe("1 day");
  });

  it("formats multiple days correctly", () => {
    expect(formatDays(5)).toBe("5 days");
  });

  it("formats 0 days correctly", () => {
    expect(formatDays(0)).toBe("0 days");
  });
});

describe("Leave Balance Status", () => {
  it("returns good when plenty of days left", () => {
    expect(getBalanceStatus(15, 20)).toBe("good");
  });

  it("returns warning when 20% or less remaining", () => {
    expect(getBalanceStatus(4, 20)).toBe("warning");
  });

  it("returns critical when 0 or negative", () => {
    expect(getBalanceStatus(0, 20)).toBe("critical");
    expect(getBalanceStatus(-2, 20)).toBe("critical");
  });

  it("returns warning at exactly 20%", () => {
    expect(getBalanceStatus(4, 20)).toBe("warning");
  });

  it("returns good just above 20%", () => {
    expect(getBalanceStatus(5, 20)).toBe("good");
  });
});
