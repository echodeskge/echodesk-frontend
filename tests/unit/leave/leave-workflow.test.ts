/**
 * Tests for leave request workflow logic.
 * Tests state transitions, validation rules, and action availability.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

type LeaveStatus = "pending" | "manager_approved" | "hr_approved" | "approved" | "rejected" | "cancelled";

interface LeaveRequest {
  status: LeaveStatus;
  start_date: string;
  end_date: string;
  total_days: number;
}

function makeRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    status: "pending",
    start_date: "2026-05-01",
    end_date: "2026-05-05",
    total_days: 3,
    ...overrides,
  };
}

// Action availability based on status
function canApprove(status: LeaveStatus): boolean {
  return ["pending", "manager_approved", "hr_approved"].includes(status);
}

function canReject(status: LeaveStatus): boolean {
  return ["pending", "manager_approved", "hr_approved"].includes(status);
}

function canCancel(status: LeaveStatus): boolean {
  return status !== "cancelled";
}

function canEdit(status: LeaveStatus): boolean {
  return status === "pending";
}

// Next status after approval
function getNextStatus(
  currentStatus: LeaveStatus,
  requiresManager: boolean,
  requiresHr: boolean
): LeaveStatus {
  if (currentStatus === "pending") {
    if (requiresManager) return "manager_approved";
    if (requiresHr) return "hr_approved";
    return "approved";
  }
  if (currentStatus === "manager_approved") {
    if (requiresHr) return "hr_approved";
    return "approved";
  }
  if (currentStatus === "hr_approved") {
    return "approved";
  }
  return currentStatus;
}

// Date range validation
function isValidDateRange(startDate: string, endDate: string): boolean {
  return new Date(startDate) <= new Date(endDate);
}

function isInFuture(startDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(startDate) >= today;
}

function hasOverlap(
  existingRequests: Array<{ start_date: string; end_date: string; status: LeaveStatus }>,
  newStart: string,
  newEnd: string
): boolean {
  const start = new Date(newStart);
  const end = new Date(newEnd);
  return existingRequests.some((req) => {
    if (["rejected", "cancelled"].includes(req.status)) return false;
    const rStart = new Date(req.start_date);
    const rEnd = new Date(req.end_date);
    return start <= rEnd && end >= rStart;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Leave Request Actions", () => {
  describe("canApprove", () => {
    it("can approve pending", () => expect(canApprove("pending")).toBe(true));
    it("can approve manager_approved", () => expect(canApprove("manager_approved")).toBe(true));
    it("can approve hr_approved", () => expect(canApprove("hr_approved")).toBe(true));
    it("cannot approve already approved", () => expect(canApprove("approved")).toBe(false));
    it("cannot approve rejected", () => expect(canApprove("rejected")).toBe(false));
    it("cannot approve cancelled", () => expect(canApprove("cancelled")).toBe(false));
  });

  describe("canReject", () => {
    it("can reject pending", () => expect(canReject("pending")).toBe(true));
    it("can reject manager_approved", () => expect(canReject("manager_approved")).toBe(true));
    it("cannot reject approved", () => expect(canReject("approved")).toBe(false));
    it("cannot reject cancelled", () => expect(canReject("cancelled")).toBe(false));
  });

  describe("canCancel", () => {
    it("can cancel pending", () => expect(canCancel("pending")).toBe(true));
    it("can cancel approved", () => expect(canCancel("approved")).toBe(true));
    it("cannot cancel already cancelled", () => expect(canCancel("cancelled")).toBe(false));
  });

  describe("canEdit", () => {
    it("can edit pending only", () => expect(canEdit("pending")).toBe(true));
    it("cannot edit manager_approved", () => expect(canEdit("manager_approved")).toBe(false));
    it("cannot edit approved", () => expect(canEdit("approved")).toBe(false));
    it("cannot edit rejected", () => expect(canEdit("rejected")).toBe(false));
  });
});

describe("Approval Status Transitions", () => {
  it("pending → manager_approved (manager only)", () => {
    expect(getNextStatus("pending", true, false)).toBe("manager_approved");
  });

  it("pending → approved (no approvals needed)", () => {
    expect(getNextStatus("pending", false, false)).toBe("approved");
  });

  it("pending → hr_approved (HR only, no manager)", () => {
    expect(getNextStatus("pending", false, true)).toBe("hr_approved");
  });

  it("manager_approved → hr_approved (both required)", () => {
    expect(getNextStatus("manager_approved", true, true)).toBe("hr_approved");
  });

  it("manager_approved → approved (manager only)", () => {
    expect(getNextStatus("manager_approved", true, false)).toBe("approved");
  });

  it("hr_approved → approved", () => {
    expect(getNextStatus("hr_approved", true, true)).toBe("approved");
  });

  it("already approved stays approved", () => {
    expect(getNextStatus("approved", true, true)).toBe("approved");
  });
});

describe("Date Validation", () => {
  it("valid: start before end", () => {
    expect(isValidDateRange("2026-05-01", "2026-05-05")).toBe(true);
  });

  it("valid: same day", () => {
    expect(isValidDateRange("2026-05-01", "2026-05-01")).toBe(true);
  });

  it("invalid: start after end", () => {
    expect(isValidDateRange("2026-05-05", "2026-05-01")).toBe(false);
  });
});

describe("Overlap Detection", () => {
  const existingRequests = [
    { start_date: "2026-05-01", end_date: "2026-05-05", status: "approved" as LeaveStatus },
    { start_date: "2026-05-15", end_date: "2026-05-20", status: "pending" as LeaveStatus },
    { start_date: "2026-06-01", end_date: "2026-06-03", status: "cancelled" as LeaveStatus },
  ];

  it("detects overlap with approved request", () => {
    expect(hasOverlap(existingRequests, "2026-05-03", "2026-05-07")).toBe(true);
  });

  it("detects overlap with pending request", () => {
    expect(hasOverlap(existingRequests, "2026-05-18", "2026-05-22")).toBe(true);
  });

  it("no overlap with cancelled request", () => {
    expect(hasOverlap(existingRequests, "2026-06-01", "2026-06-03")).toBe(false);
  });

  it("no overlap with gap between requests", () => {
    expect(hasOverlap(existingRequests, "2026-05-06", "2026-05-14")).toBe(false);
  });

  it("adjacent dates don't overlap", () => {
    expect(hasOverlap(existingRequests, "2026-05-06", "2026-05-10")).toBe(false);
  });

  it("exact same dates overlap", () => {
    expect(hasOverlap(existingRequests, "2026-05-01", "2026-05-05")).toBe(true);
  });

  it("no overlap when no existing requests", () => {
    expect(hasOverlap([], "2026-05-01", "2026-05-05")).toBe(false);
  });
});

describe("Balance Sufficiency Check", () => {
  function hasEnoughBalance(available: number, requested: number, allowNegative: boolean, maxNegative: number): boolean {
    if (available >= requested) return true;
    if (allowNegative) {
      const deficit = requested - available;
      return deficit <= maxNegative;
    }
    return false;
  }

  it("enough balance", () => {
    expect(hasEnoughBalance(20, 5, false, 0)).toBe(true);
  });

  it("exact balance", () => {
    expect(hasEnoughBalance(5, 5, false, 0)).toBe(true);
  });

  it("insufficient balance, no negative allowed", () => {
    expect(hasEnoughBalance(3, 5, false, 0)).toBe(false);
  });

  it("insufficient but negative allowed within limit", () => {
    expect(hasEnoughBalance(3, 5, true, 5)).toBe(true);
  });

  it("insufficient and exceeds negative limit", () => {
    expect(hasEnoughBalance(3, 10, true, 5)).toBe(false);
  });

  it("zero balance, negative allowed", () => {
    expect(hasEnoughBalance(0, 3, true, 5)).toBe(true);
  });

  it("zero balance, negative not allowed", () => {
    expect(hasEnoughBalance(0, 1, false, 0)).toBe(false);
  });
});
