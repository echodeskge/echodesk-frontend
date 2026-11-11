/**
 * Pure pricing helpers: pack sums from live prices, calculator rules,
 * registration query strings and the signup URL parser.
 */
import { describe, expect, it } from "vitest";
import { FALLBACK_FEATURES } from "@/data/pricing-fallback";
import {
  clampEmployees,
  expandSelection,
  formatGel,
  keysToIds,
  matchPack,
  monthlyTotal,
  packModuleKeys,
  packPerEmployee,
  parseRegistrationParams,
  priceByKey,
  registrationUrl,
  toggleModule,
  visibleModuleKeys,
} from "@/lib/pricing";
import { EDITED, LIVE_LIKE } from "./pricing-fixtures";

describe("packs are computed from the API prices", () => {
  it("matches the 2026-11-11 catalogue: 44 / 44 / 47 / 100", () => {
    expect(packPerEmployee("bookings", LIVE_LIKE)).toBe(44);
    expect(packPerEmployee("shop", LIVE_LIKE)).toBe(44);
    expect(packPerEmployee("callcentre", LIVE_LIKE)).toBe(47);
    expect(packPerEmployee("everything", LIVE_LIKE)).toBe(100);
  });

  it("follows an admin price edit", () => {
    expect(packPerEmployee("bookings", EDITED)).toBe(46);
    expect(packPerEmployee("shop", EDITED)).toBe(45);
    expect(packPerEmployee("callcentre", EDITED)).toBe(48);
    expect(packPerEmployee("everything", EDITED)).toBe(102);
  });

  it("the shipped fallback catalogue reproduces the live totals", () => {
    expect(packPerEmployee("bookings", FALLBACK_FEATURES)).toBe(44);
    expect(packPerEmployee("callcentre", FALLBACK_FEATURES)).toBe(47);
    expect(packPerEmployee("everything", FALLBACK_FEATURES)).toBe(100);
  });

  it("drops pack keys the API does not return", () => {
    const noCalls = LIVE_LIKE.filter((f) => f.key !== "ip_calling");
    expect(packModuleKeys("callcentre", noCalls)).not.toContain("ip_calling");
    expect(packPerEmployee("callcentre", noCalls)).toBe(38);
  });

  it("hides the zero-price stubs and the workspace from the sellable list", () => {
    const keys = visibleModuleKeys(LIVE_LIKE);
    expect(keys).toEqual([
      "ticket_management",
      "social_integrations",
      "ai_companion",
      "ip_calling",
      "booking_management",
      "ecommerce_crm",
      "invoice_management",
      "leave_management",
    ]);
  });

  it("matches a module set back to its pack", () => {
    expect(matchPack(["booking_management", "social_integrations", "invoice_management"], LIVE_LIKE)).toBe("bookings");
    expect(matchPack(visibleModuleKeys(LIVE_LIKE), LIVE_LIKE)).toBe("everything");
    expect(matchPack(["ticket_management"], LIVE_LIKE)).toBeNull();
  });
});

describe("calculator math", () => {
  const prices = priceByKey(LIVE_LIKE);

  it("total = (workspace + modules) × employees", () => {
    expect(monthlyTotal(["ticket_management"], prices, 5)).toBe(50);
    expect(monthlyTotal(["ticket_management", "social_integrations"], prices, 10)).toBe(290);
    expect(monthlyTotal([], prices, 5)).toBe(5);
  });

  it("employees snap to 5…200 in steps of 5", () => {
    expect(clampEmployees(1)).toBe(5);
    expect(clampEmployees(7)).toBe(5);
    expect(clampEmployees(8)).toBe(10);
    expect(clampEmployees(999)).toBe(200);
    expect(clampEmployees(NaN)).toBe(5);
  });

  it("AI switches the inbox on; switching the inbox off drops AI", () => {
    const on = toggleModule(["ticket_management"], "ai_companion");
    expect(on.keys).toEqual(expect.arrayContaining(["ai_companion", "social_integrations"]));
    expect(on.autoEnabled).toEqual(["social_integrations"]);

    const off = toggleModule(on.keys, "social_integrations");
    expect(off.keys).toEqual(["ticket_management"]);
    expect(off.autoEnabled).toEqual([]);
  });

  it("the registration payload carries workspace + attached stubs", () => {
    const keys = expandSelection(["ecommerce_crm", "ip_calling"], LIVE_LIKE);
    expect(keys).toEqual(
      expect.arrayContaining([
        "user_management",
        "settings",
        "advanced_analytics",
        "ecommerce_crm",
        "order_management",
        "ip_calling",
        "sip_calling",
      ]),
    );
    expect(keys).not.toContain("ticket_management");
    expect(keysToIds(keys, LIVE_LIKE).sort((a, b) => a - b)).toEqual([2, 3, 4, 8, 44, 45, 46]);
  });
});

describe("registration query string", () => {
  it("carries keys, never ids, plus the pack slug", () => {
    const url = registrationUrl({ pack: "bookings", modules: ["booking_management", "social_integrations"], employees: 5 });
    expect(url).toBe("/registration?pack=bookings&modules=booking_management%2Csocial_integrations&employees=5");
    expect(registrationUrl({ modules: ["ticket_management"], employees: 7 })).toBe(
      "/registration?modules=ticket_management&employees=5",
    );
  });

  it("parses a pack link", () => {
    const parsed = parseRegistrationParams(new URLSearchParams("pack=callcentre&employees=10"), LIVE_LIKE);
    expect(parsed.pack).toBe("callcentre");
    expect(parsed.moduleKeys).toEqual([
      "ticket_management",
      "social_integrations",
      "ip_calling",
      "invoice_management",
      "leave_management",
    ]);
    expect(parsed.employees).toBe(10);
    expect(parsed.preselected).toBe(true);
  });

  it("parses a modules link and ignores unknown or hidden keys", () => {
    const parsed = parseRegistrationParams(
      new URLSearchParams("modules=ticket_management,settings,bogus&employees=3"),
      LIVE_LIKE,
    );
    expect(parsed.pack).toBeNull();
    expect(parsed.moduleKeys).toEqual(["ticket_management"]);
    expect(parsed.employees).toBe(5);
  });

  it("still understands the legacy ?features=<ids>&agents=", () => {
    const parsed = parseRegistrationParams(new URLSearchParams("features=1,7,2,4&agents=15"), LIVE_LIKE);
    expect(parsed.moduleKeys).toEqual(["ticket_management", "social_integrations"]);
    expect(parsed.employees).toBe(15);
    expect(parsed.preselected).toBe(true);
  });

  it("a bare /registration is not preselected", () => {
    const parsed = parseRegistrationParams(new URLSearchParams(""), LIVE_LIKE);
    expect(parsed.preselected).toBe(false);
    expect(parsed.employees).toBe(5);
  });
});

describe("formatGel", () => {
  it("prints whole lari without decimals and groups thousands", () => {
    expect(formatGel(44)).toBe("44");
    expect(formatGel(47.5)).toBe("47.5");
    expect(formatGel(1000)).toBe("1 000");
    expect(formatGel(2820)).toBe("2 820");
  });
});
