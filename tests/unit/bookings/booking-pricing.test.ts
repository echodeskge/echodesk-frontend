/**
 * Tests for booking pricing and payment calculations.
 * Tests deposit calculations, remaining amounts, total duration,
 * refund policies, and cancellation timing rules.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

type CancellationPolicy = "full" | "50_percent" | "25_percent" | "none";

interface BookingPricing {
  base_price: number;
  deposit_percentage: number;
  duration_minutes: number;
  buffer_time_minutes: number;
}

function makePricing(overrides: Partial<BookingPricing> = {}): BookingPricing {
  return {
    base_price: 100,
    deposit_percentage: 20,
    duration_minutes: 60,
    buffer_time_minutes: 15,
    ...overrides,
  };
}

// Deposit calculation
function calculateDeposit(basePrice: number, depositPercentage: number): number {
  return (basePrice * depositPercentage) / 100;
}

// Remaining amount after deposit
function calculateRemaining(totalAmount: number, depositAmount: number): number {
  return totalAmount - depositAmount;
}

// Total duration including buffer
function calculateTotalDuration(
  durationMinutes: number,
  bufferTimeMinutes: number
): number {
  return durationMinutes + bufferTimeMinutes;
}

// Refund calculation based on cancellation policy
function calculateRefund(
  amountPaid: number,
  policy: CancellationPolicy
): number {
  const refundPercentages: Record<CancellationPolicy, number> = {
    full: 100,
    "50_percent": 50,
    "25_percent": 25,
    none: 0,
  };
  const percentage = refundPercentages[policy];
  return (amountPaid * percentage) / 100;
}

// Determine cancellation policy based on hours before appointment
function getCancellationPolicy(hoursBeforeAppointment: number): CancellationPolicy {
  if (hoursBeforeAppointment >= 48) return "full";
  if (hoursBeforeAppointment >= 24) return "50_percent";
  if (hoursBeforeAppointment >= 12) return "25_percent";
  return "none";
}

// Combined: refund based on timing
function calculateTimingBasedRefund(
  amountPaid: number,
  hoursBeforeAppointment: number
): number {
  const policy = getCancellationPolicy(hoursBeforeAppointment);
  return calculateRefund(amountPaid, policy);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Deposit Calculation", () => {
  it("calculates deposit as base_price * deposit_percentage / 100", () => {
    expect(calculateDeposit(100, 20)).toBe(20);
  });

  it("calculates deposit for 50% rate", () => {
    expect(calculateDeposit(200, 50)).toBe(100);
  });

  it("calculates deposit for 10% rate", () => {
    expect(calculateDeposit(150, 10)).toBe(15);
  });

  it("zero deposit when percentage is 0", () => {
    expect(calculateDeposit(100, 0)).toBe(0);
  });

  it("full amount when deposit percentage is 100", () => {
    expect(calculateDeposit(100, 100)).toBe(100);
  });

  it("handles fractional results", () => {
    expect(calculateDeposit(99, 33)).toBeCloseTo(32.67, 2);
  });

  it("handles large amounts", () => {
    expect(calculateDeposit(10000, 25)).toBe(2500);
  });

  it("zero price means zero deposit regardless of percentage", () => {
    expect(calculateDeposit(0, 50)).toBe(0);
  });
});

describe("Remaining Amount Calculation", () => {
  it("calculates remaining as total - deposit", () => {
    expect(calculateRemaining(100, 20)).toBe(80);
  });

  it("remaining is zero when deposit covers full amount", () => {
    expect(calculateRemaining(100, 100)).toBe(0);
  });

  it("remaining equals total when deposit is zero", () => {
    expect(calculateRemaining(100, 0)).toBe(100);
  });

  it("handles fractional amounts", () => {
    expect(calculateRemaining(99.99, 32.67)).toBeCloseTo(67.32, 2);
  });

  it("zero deposit means full payment required", () => {
    const pricing = makePricing({ base_price: 250, deposit_percentage: 0 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);
    expect(deposit).toBe(0);
    expect(remaining).toBe(250);
  });

  it("100% deposit means no remaining balance", () => {
    const pricing = makePricing({ base_price: 250, deposit_percentage: 100 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);
    expect(deposit).toBe(250);
    expect(remaining).toBe(0);
  });
});

describe("Total Duration Calculation", () => {
  it("adds duration and buffer time", () => {
    expect(calculateTotalDuration(60, 15)).toBe(75);
  });

  it("zero buffer means total equals duration", () => {
    expect(calculateTotalDuration(60, 0)).toBe(60);
  });

  it("handles short appointments", () => {
    expect(calculateTotalDuration(15, 5)).toBe(20);
  });

  it("handles long appointments", () => {
    expect(calculateTotalDuration(180, 30)).toBe(210);
  });

  it("zero duration with buffer only", () => {
    expect(calculateTotalDuration(0, 15)).toBe(15);
  });

  it("both zero gives zero", () => {
    expect(calculateTotalDuration(0, 0)).toBe(0);
  });
});

describe("Refund Calculation by Policy", () => {
  it("full refund returns 100% of amount paid", () => {
    expect(calculateRefund(100, "full")).toBe(100);
  });

  it("50% policy returns half of amount paid", () => {
    expect(calculateRefund(100, "50_percent")).toBe(50);
  });

  it("25% policy returns quarter of amount paid", () => {
    expect(calculateRefund(100, "25_percent")).toBe(25);
  });

  it("none policy returns zero", () => {
    expect(calculateRefund(100, "none")).toBe(0);
  });

  it("full refund on larger amount", () => {
    expect(calculateRefund(500, "full")).toBe(500);
  });

  it("50% refund on fractional amount", () => {
    expect(calculateRefund(75.50, "50_percent")).toBe(37.75);
  });

  it("zero amount paid means zero refund regardless of policy", () => {
    expect(calculateRefund(0, "full")).toBe(0);
    expect(calculateRefund(0, "50_percent")).toBe(0);
    expect(calculateRefund(0, "25_percent")).toBe(0);
    expect(calculateRefund(0, "none")).toBe(0);
  });
});

describe("Cancellation Policy Based on Timing", () => {
  it("full refund when 48+ hours before appointment", () => {
    expect(getCancellationPolicy(48)).toBe("full");
    expect(getCancellationPolicy(72)).toBe("full");
    expect(getCancellationPolicy(168)).toBe("full");
  });

  it("50% refund when 24-47 hours before appointment", () => {
    expect(getCancellationPolicy(24)).toBe("50_percent");
    expect(getCancellationPolicy(36)).toBe("50_percent");
    expect(getCancellationPolicy(47)).toBe("50_percent");
  });

  it("25% refund when 12-23 hours before appointment", () => {
    expect(getCancellationPolicy(12)).toBe("25_percent");
    expect(getCancellationPolicy(18)).toBe("25_percent");
    expect(getCancellationPolicy(23)).toBe("25_percent");
  });

  it("no refund when less than 12 hours before appointment", () => {
    expect(getCancellationPolicy(11)).toBe("none");
    expect(getCancellationPolicy(6)).toBe("none");
    expect(getCancellationPolicy(1)).toBe("none");
    expect(getCancellationPolicy(0)).toBe("none");
  });
});

describe("Timing-Based Refund (Combined)", () => {
  it("cancelling 48h before: full refund of $200", () => {
    expect(calculateTimingBasedRefund(200, 48)).toBe(200);
  });

  it("cancelling 72h before: full refund of $150", () => {
    expect(calculateTimingBasedRefund(150, 72)).toBe(150);
  });

  it("cancelling 24h before: 50% refund of $200", () => {
    expect(calculateTimingBasedRefund(200, 24)).toBe(100);
  });

  it("cancelling 36h before: 50% refund of $80", () => {
    expect(calculateTimingBasedRefund(80, 36)).toBe(40);
  });

  it("cancelling 12h before: 25% refund of $200", () => {
    expect(calculateTimingBasedRefund(200, 12)).toBe(50);
  });

  it("cancelling 18h before: 25% refund of $120", () => {
    expect(calculateTimingBasedRefund(120, 18)).toBe(30);
  });

  it("cancelling 6h before: no refund", () => {
    expect(calculateTimingBasedRefund(200, 6)).toBe(0);
  });

  it("cancelling 0h before (at appointment time): no refund", () => {
    expect(calculateTimingBasedRefund(500, 0)).toBe(0);
  });

  it("cancelling last minute: no refund", () => {
    expect(calculateTimingBasedRefund(100, 1)).toBe(0);
  });
});

describe("End-to-End Pricing Scenarios", () => {
  it("standard booking: $100 with 20% deposit", () => {
    const pricing = makePricing({ base_price: 100, deposit_percentage: 20 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);
    const totalDuration = calculateTotalDuration(
      pricing.duration_minutes,
      pricing.buffer_time_minutes
    );

    expect(deposit).toBe(20);
    expect(remaining).toBe(80);
    expect(totalDuration).toBe(75);
  });

  it("premium booking: $500 with 50% deposit, 2h duration, 30min buffer", () => {
    const pricing = makePricing({
      base_price: 500,
      deposit_percentage: 50,
      duration_minutes: 120,
      buffer_time_minutes: 30,
    });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);
    const totalDuration = calculateTotalDuration(
      pricing.duration_minutes,
      pricing.buffer_time_minutes
    );

    expect(deposit).toBe(250);
    expect(remaining).toBe(250);
    expect(totalDuration).toBe(150);
  });

  it("no-deposit booking: full payment required upfront", () => {
    const pricing = makePricing({ base_price: 75, deposit_percentage: 0 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);

    expect(deposit).toBe(0);
    expect(remaining).toBe(75);
  });

  it("full-deposit booking: no remaining balance", () => {
    const pricing = makePricing({ base_price: 200, deposit_percentage: 100 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const remaining = calculateRemaining(pricing.base_price, deposit);

    expect(deposit).toBe(200);
    expect(remaining).toBe(0);
  });

  it("cancellation refund on deposit: $200 booking, 20% deposit, cancel 24h before", () => {
    const pricing = makePricing({ base_price: 200, deposit_percentage: 20 });
    const deposit = calculateDeposit(pricing.base_price, pricing.deposit_percentage);
    const refund = calculateTimingBasedRefund(deposit, 24);

    expect(deposit).toBe(40);
    expect(refund).toBe(20); // 50% of $40 deposit
  });

  it("cancellation refund on full payment: $300 fully paid, cancel 48h before", () => {
    const amountPaid = 300;
    const refund = calculateTimingBasedRefund(amountPaid, 48);

    expect(refund).toBe(300); // full refund
  });

  it("late cancellation on fully paid booking: no refund", () => {
    const amountPaid = 300;
    const refund = calculateTimingBasedRefund(amountPaid, 6);

    expect(refund).toBe(0);
  });
});
