/**
 * Tests for booking status logic.
 * Tests status badge colors, action availability, payment status transitions,
 * and display text mapping.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

type PaymentStatus =
  | "unpaid"
  | "deposit_paid"
  | "fully_paid"
  | "refunded"
  | "partially_refunded";

interface Booking {
  id: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  scheduled_at: string;
  duration_minutes: number;
  client_name: string;
  staff_name: string | null;
  total_amount: number;
  deposit_amount: number;
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    status: "pending",
    payment_status: "unpaid",
    scheduled_at: "2026-05-01T10:00:00Z",
    duration_minutes: 60,
    client_name: "John Doe",
    staff_name: "Jane Smith",
    total_amount: 100,
    deposit_amount: 20,
    ...overrides,
  };
}

// Status badge color mapping
function getStatusBadgeColor(status: BookingStatus): string {
  const colorMap: Record<BookingStatus, string> = {
    pending: "warning",
    confirmed: "info",
    in_progress: "primary",
    completed: "success",
    cancelled: "destructive",
    no_show: "destructive",
  };
  return colorMap[status] || "default";
}

// Payment status badge color mapping
function getPaymentBadgeColor(status: PaymentStatus): string {
  const colorMap: Record<PaymentStatus, string> = {
    unpaid: "destructive",
    deposit_paid: "warning",
    fully_paid: "success",
    refunded: "secondary",
    partially_refunded: "outline",
  };
  return colorMap[status] || "default";
}

// Available actions per booking status
function getAvailableActions(status: BookingStatus): string[] {
  const actionsMap: Record<BookingStatus, string[]> = {
    pending: ["confirm", "cancel", "reschedule", "assign_staff"],
    confirmed: ["complete", "cancel", "reschedule", "assign_staff"],
    in_progress: ["complete", "cancel"],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  return actionsMap[status] || [];
}

// Action guards
function canConfirm(status: BookingStatus): boolean {
  return status === "pending";
}

function canComplete(status: BookingStatus): boolean {
  return status === "confirmed" || status === "in_progress";
}

function canCancel(status: BookingStatus): boolean {
  return status !== "cancelled" && status !== "completed" && status !== "no_show";
}

function canReschedule(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

function canAssignStaff(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

// Payment status transitions
function canTransitionPayment(
  current: PaymentStatus,
  target: PaymentStatus
): boolean {
  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    unpaid: ["deposit_paid", "fully_paid"],
    deposit_paid: ["fully_paid", "refunded", "partially_refunded"],
    fully_paid: ["refunded", "partially_refunded"],
    refunded: [],
    partially_refunded: ["refunded"],
  };
  return (validTransitions[current] || []).includes(target);
}

// Status display text
function getStatusDisplayText(status: BookingStatus): string {
  const textMap: Record<BookingStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };
  return textMap[status] || status;
}

function getPaymentDisplayText(status: PaymentStatus): string {
  const textMap: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    deposit_paid: "Deposit Paid",
    fully_paid: "Fully Paid",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  };
  return textMap[status] || status;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Booking Status Badge Colors", () => {
  const expectedColors: Record<BookingStatus, string> = {
    pending: "warning",
    confirmed: "info",
    in_progress: "primary",
    completed: "success",
    cancelled: "destructive",
    no_show: "destructive",
  };

  for (const [status, color] of Object.entries(expectedColors)) {
    it(`maps '${status}' to '${color}' badge color`, () => {
      expect(getStatusBadgeColor(status as BookingStatus)).toBe(color);
    });
  }
});

describe("Payment Status Badge Colors", () => {
  const expectedColors: Record<PaymentStatus, string> = {
    unpaid: "destructive",
    deposit_paid: "warning",
    fully_paid: "success",
    refunded: "secondary",
    partially_refunded: "outline",
  };

  for (const [status, color] of Object.entries(expectedColors)) {
    it(`maps '${status}' to '${color}' badge color`, () => {
      expect(getPaymentBadgeColor(status as PaymentStatus)).toBe(color);
    });
  }
});

describe("Available Actions Per Booking Status", () => {
  it("pending: confirm, cancel, reschedule, assign_staff", () => {
    const actions = getAvailableActions("pending");
    expect(actions).toContain("confirm");
    expect(actions).toContain("cancel");
    expect(actions).toContain("reschedule");
    expect(actions).toContain("assign_staff");
    expect(actions).not.toContain("complete");
  });

  it("confirmed: complete, cancel, reschedule, assign_staff", () => {
    const actions = getAvailableActions("confirmed");
    expect(actions).toContain("complete");
    expect(actions).toContain("cancel");
    expect(actions).toContain("reschedule");
    expect(actions).toContain("assign_staff");
    expect(actions).not.toContain("confirm");
  });

  it("in_progress: complete, cancel only", () => {
    const actions = getAvailableActions("in_progress");
    expect(actions).toEqual(["complete", "cancel"]);
  });

  it("completed: no actions available", () => {
    expect(getAvailableActions("completed")).toEqual([]);
  });

  it("cancelled: no actions available", () => {
    expect(getAvailableActions("cancelled")).toEqual([]);
  });

  it("no_show: no actions available", () => {
    expect(getAvailableActions("no_show")).toEqual([]);
  });
});

describe("Confirm Action Guard", () => {
  it("can confirm pending booking", () => {
    expect(canConfirm("pending")).toBe(true);
  });

  it("cannot confirm already confirmed booking", () => {
    expect(canConfirm("confirmed")).toBe(false);
  });

  it("cannot confirm completed booking", () => {
    expect(canConfirm("completed")).toBe(false);
  });

  it("cannot confirm cancelled booking", () => {
    expect(canConfirm("cancelled")).toBe(false);
  });

  it("cannot confirm in_progress booking", () => {
    expect(canConfirm("in_progress")).toBe(false);
  });

  it("cannot confirm no_show booking", () => {
    expect(canConfirm("no_show")).toBe(false);
  });
});

describe("Complete Action Guard", () => {
  it("can complete confirmed booking", () => {
    expect(canComplete("confirmed")).toBe(true);
  });

  it("can complete in_progress booking", () => {
    expect(canComplete("in_progress")).toBe(true);
  });

  it("cannot complete pending booking (must be confirmed first)", () => {
    expect(canComplete("pending")).toBe(false);
  });

  it("cannot complete already completed booking", () => {
    expect(canComplete("completed")).toBe(false);
  });

  it("cannot complete cancelled booking", () => {
    expect(canComplete("cancelled")).toBe(false);
  });

  it("cannot complete no_show booking", () => {
    expect(canComplete("no_show")).toBe(false);
  });
});

describe("Cancel Action Guard", () => {
  it("can cancel pending booking", () => {
    expect(canCancel("pending")).toBe(true);
  });

  it("can cancel confirmed booking", () => {
    expect(canCancel("confirmed")).toBe(true);
  });

  it("can cancel in_progress booking", () => {
    expect(canCancel("in_progress")).toBe(true);
  });

  it("cannot cancel already cancelled booking", () => {
    expect(canCancel("cancelled")).toBe(false);
  });

  it("cannot cancel completed booking", () => {
    expect(canCancel("completed")).toBe(false);
  });

  it("cannot cancel no_show booking", () => {
    expect(canCancel("no_show")).toBe(false);
  });
});

describe("Reschedule Action Guard", () => {
  it("can reschedule pending booking", () => {
    expect(canReschedule("pending")).toBe(true);
  });

  it("can reschedule confirmed booking", () => {
    expect(canReschedule("confirmed")).toBe(true);
  });

  it("cannot reschedule in_progress booking", () => {
    expect(canReschedule("in_progress")).toBe(false);
  });

  it("cannot reschedule completed booking", () => {
    expect(canReschedule("completed")).toBe(false);
  });

  it("cannot reschedule cancelled booking", () => {
    expect(canReschedule("cancelled")).toBe(false);
  });
});

describe("Assign Staff Action Guard", () => {
  it("can assign staff to pending booking", () => {
    expect(canAssignStaff("pending")).toBe(true);
  });

  it("can assign staff to confirmed booking", () => {
    expect(canAssignStaff("confirmed")).toBe(true);
  });

  it("cannot assign staff to in_progress booking", () => {
    expect(canAssignStaff("in_progress")).toBe(false);
  });

  it("cannot assign staff to completed booking", () => {
    expect(canAssignStaff("completed")).toBe(false);
  });

  it("cannot assign staff to cancelled booking", () => {
    expect(canAssignStaff("cancelled")).toBe(false);
  });
});

describe("Payment Status Transitions", () => {
  it("unpaid -> deposit_paid is valid", () => {
    expect(canTransitionPayment("unpaid", "deposit_paid")).toBe(true);
  });

  it("unpaid -> fully_paid is valid", () => {
    expect(canTransitionPayment("unpaid", "fully_paid")).toBe(true);
  });

  it("deposit_paid -> fully_paid is valid", () => {
    expect(canTransitionPayment("deposit_paid", "fully_paid")).toBe(true);
  });

  it("deposit_paid -> refunded is valid", () => {
    expect(canTransitionPayment("deposit_paid", "refunded")).toBe(true);
  });

  it("deposit_paid -> partially_refunded is valid", () => {
    expect(canTransitionPayment("deposit_paid", "partially_refunded")).toBe(true);
  });

  it("fully_paid -> refunded is valid", () => {
    expect(canTransitionPayment("fully_paid", "refunded")).toBe(true);
  });

  it("fully_paid -> partially_refunded is valid", () => {
    expect(canTransitionPayment("fully_paid", "partially_refunded")).toBe(true);
  });

  it("partially_refunded -> refunded is valid", () => {
    expect(canTransitionPayment("partially_refunded", "refunded")).toBe(true);
  });

  it("refunded -> any is invalid (terminal state)", () => {
    expect(canTransitionPayment("refunded", "unpaid")).toBe(false);
    expect(canTransitionPayment("refunded", "deposit_paid")).toBe(false);
    expect(canTransitionPayment("refunded", "fully_paid")).toBe(false);
    expect(canTransitionPayment("refunded", "partially_refunded")).toBe(false);
  });

  it("unpaid cannot go directly to refunded", () => {
    expect(canTransitionPayment("unpaid", "refunded")).toBe(false);
  });

  it("unpaid cannot go directly to partially_refunded", () => {
    expect(canTransitionPayment("unpaid", "partially_refunded")).toBe(false);
  });

  it("fully_paid cannot go back to deposit_paid", () => {
    expect(canTransitionPayment("fully_paid", "deposit_paid")).toBe(false);
  });

  it("fully_paid cannot go back to unpaid", () => {
    expect(canTransitionPayment("fully_paid", "unpaid")).toBe(false);
  });
});

describe("Status Display Text Mapping", () => {
  const bookingStatuses: Record<BookingStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };

  for (const [status, text] of Object.entries(bookingStatuses)) {
    it(`displays '${status}' as '${text}'`, () => {
      expect(getStatusDisplayText(status as BookingStatus)).toBe(text);
    });
  }

  const paymentStatuses: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    deposit_paid: "Deposit Paid",
    fully_paid: "Fully Paid",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  };

  for (const [status, text] of Object.entries(paymentStatuses)) {
    it(`displays payment '${status}' as '${text}'`, () => {
      expect(getPaymentDisplayText(status as PaymentStatus)).toBe(text);
    });
  }
});
