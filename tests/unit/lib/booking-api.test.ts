import { describe, expect, it } from "vitest";
import {
  amountDueNow,
  bookingApiBase,
  formatMoney,
  fromIsoDate,
  isValidSalonSlug,
  parseApiError,
  paymentOptionsFor,
  shortTime,
  toIsoDate,
} from "@/lib/booking-api";
import { monthGrid } from "@/components/public-booking/month-calendar";

describe("booking-api helpers", () => {
  it("accepts tenant-like slugs only", () => {
    expect(isValidSalonSlug("nitchiani")).toBe(true);
    expect(isValidSalonSlug("salon_2-b")).toBe(true);
    // Anything that could change the host the server fetches from is rejected.
    for (const bad of ["", "a.b", "evil.com/x", "UPPER", "a/b", "-lead", "x".repeat(70)]) {
      expect(isValidSalonSlug(bad)).toBe(false);
    }
  });

  it("builds the salon API base from the API domain", () => {
    expect(bookingApiBase("nitchiani")).toMatch(/^https:\/\/nitchiani\./);
  });

  it("offers only the payment options that fit the service", () => {
    const info = { payment_options: ["cash", "deposit", "full"] as const };
    const mutable = { payment_options: [...info.payment_options] };
    expect(paymentOptionsFor(mutable, { base_price: "50.00", deposit_percentage: 20 })).toEqual(["cash", "deposit", "full"]);
    // No meaningful deposit → no deposit option
    expect(paymentOptionsFor(mutable, { base_price: "50.00", deposit_percentage: 0 })).toEqual(["cash", "full"]);
    expect(paymentOptionsFor(mutable, { base_price: "50.00", deposit_percentage: 100 })).toEqual(["cash", "full"]);
    // Free service → nothing to charge
    expect(paymentOptionsFor(mutable, { base_price: "0.00", deposit_percentage: 20 })).toEqual(["cash"]);
    // Deposit-only salon + service without a deposit still stays bookable
    expect(paymentOptionsFor({ payment_options: ["deposit"] }, { base_price: "50.00", deposit_percentage: 0 })).toEqual(["cash"]);
  });

  it("computes what is charged now", () => {
    const service = { base_price: "50.00", deposit_amount: 10 };
    expect(amountDueNow("cash", service)).toBe(0);
    expect(amountDueNow("deposit", service)).toBe(10);
    expect(amountDueNow("full", service)).toBe(50);
  });

  it("round-trips calendar dates without timezone drift", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIsoDate(fromIsoDate("2026-12-31"))).toBe("2026-12-31");
    expect(shortTime("10:00:00")).toBe("10:00");
    expect(formatMoney("50.00")).toBe("50 ₾");
    expect(formatMoney("12.5")).toBe("12.50 ₾");
  });

  it("turns DRF error bodies into a message, field errors and a code", () => {
    const flat = parseApiError(400, { error: "This time slot was just booked." });
    expect(flat.message).toBe("This time slot was just booked.");
    expect(flat.fields).toEqual({});

    const fields = parseApiError(400, { phone_number: ["Enter a valid phone number"], email: ["Bad email"] });
    expect(fields.fields).toEqual({ phone_number: "Enter a valid phone number", email: "Bad email" });
    expect(fields.message).toBe("Enter a valid phone number");

    const coded = parseApiError(400, { code: ["email_not_verified"], detail: ["Email not verified."] });
    expect(coded.code).toBe("email_not_verified");
    expect(coded.message).toBe("Email not verified.");

    // An HTML error page (proxy 502) must not be shown to the customer
    expect(parseApiError(502, "<html>Bad gateway</html>").message).toBe("");
  });
});

describe("monthGrid", () => {
  it("lays days out Monday-first in whole weeks", () => {
    // October 2026 starts on a Thursday and has 31 days
    const cells = monthGrid(2026, 9);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]?.getDate()).toBe(1);
    expect(cells.filter(Boolean).length).toBe(31);
  });
});
