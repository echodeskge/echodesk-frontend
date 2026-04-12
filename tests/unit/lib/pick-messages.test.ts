/**
 * Tests for pick-messages.ts.
 * Verifies pickMessages, pickRouteMessages, and GLOBAL_NAMESPACES behavior.
 */
import { describe, it, expect } from "vitest";
import {
  pickMessages,
  pickRouteMessages,
  GLOBAL_NAMESPACES,
} from "@/lib/pick-messages";

// ---------------------------------------------------------------------------
// Sample messages object
// ---------------------------------------------------------------------------

const ALL_MESSAGES: Record<string, unknown> = {
  // Global namespaces
  common: { greeting: "Hello", farewell: "Goodbye" },
  nav: { home: "Home", settings: "Settings" },
  tickets: { title: "Tickets", create: "Create Ticket" },
  labels: { add: "Add Label" },
  bugReport: { title: "Bug Report" },
  notificationList: { empty: "No notifications" },
  notificationPreferences: { email: "Email" },
  notifications: { new: "New notification" },
  notFound: { message: "Page not found" },
  subscription: { plan: "Pro" },
  calls: { dial: "Dial" },
  // Route-specific namespaces
  dashboard: { widgets: "Widgets", stats: "Stats" },
  messages: { inbox: "Inbox", send: "Send" },
  invoices: { list: "Invoice List", create: "Create Invoice" },
};

// ---------------------------------------------------------------------------
// pickMessages
// ---------------------------------------------------------------------------

describe("pickMessages", () => {
  it("picks specified namespaces from messages object", () => {
    const result = pickMessages(ALL_MESSAGES, ["common", "nav"]);

    expect(result).toEqual({
      common: { greeting: "Hello", farewell: "Goodbye" },
      nav: { home: "Home", settings: "Settings" },
    });
  });

  it("returns empty object for empty namespaces array", () => {
    const result = pickMessages(ALL_MESSAGES, []);

    expect(result).toEqual({});
  });

  it("ignores namespaces that do not exist in messages", () => {
    const result = pickMessages(ALL_MESSAGES, [
      "common",
      "nonExistentNamespace",
    ]);

    expect(result).toEqual({
      common: { greeting: "Hello", farewell: "Goodbye" },
    });
    expect(result).not.toHaveProperty("nonExistentNamespace");
  });

  it("returns empty object when all namespaces are missing", () => {
    const result = pickMessages(ALL_MESSAGES, ["foo", "bar", "baz"]);

    expect(result).toEqual({});
  });

  it("picks single namespace", () => {
    const result = pickMessages(ALL_MESSAGES, ["dashboard"]);

    expect(result).toEqual({
      dashboard: { widgets: "Widgets", stats: "Stats" },
    });
  });

  it("handles empty messages object", () => {
    const result = pickMessages({}, ["common", "nav"]);

    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// pickRouteMessages
// ---------------------------------------------------------------------------

describe("pickRouteMessages", () => {
  it("always includes GLOBAL_NAMESPACES", () => {
    const result = pickRouteMessages(ALL_MESSAGES, []);

    // All global namespaces present in ALL_MESSAGES should be included
    for (const ns of GLOBAL_NAMESPACES) {
      if (ns in ALL_MESSAGES) {
        expect(result).toHaveProperty(ns);
      }
    }
  });

  it("includes route-specific namespaces in addition to globals", () => {
    const result = pickRouteMessages(ALL_MESSAGES, ["dashboard", "messages"]);

    // Should contain global namespaces
    expect(result).toHaveProperty("common");
    expect(result).toHaveProperty("nav");
    expect(result).toHaveProperty("tickets");

    // Should also contain route-specific namespaces
    expect(result).toHaveProperty("dashboard");
    expect(result).toHaveProperty("messages");
  });

  it("does not include non-requested route namespaces", () => {
    const result = pickRouteMessages(ALL_MESSAGES, ["dashboard"]);

    expect(result).toHaveProperty("dashboard");
    expect(result).not.toHaveProperty("messages");
    expect(result).not.toHaveProperty("invoices");
  });

  it("returns only global namespaces when routeNamespaces is empty", () => {
    const result = pickRouteMessages(ALL_MESSAGES, []);

    // Should have all global namespaces that exist in ALL_MESSAGES
    const expectedKeys = GLOBAL_NAMESPACES.filter(
      (ns) => ns in ALL_MESSAGES
    );
    expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
  });

  it("handles missing route namespace gracefully", () => {
    const result = pickRouteMessages(ALL_MESSAGES, [
      "dashboard",
      "nonExistent",
    ]);

    expect(result).toHaveProperty("dashboard");
    expect(result).not.toHaveProperty("nonExistent");
    // Globals still present
    expect(result).toHaveProperty("common");
  });

  it("deduplicates when route namespace overlaps with global", () => {
    // 'tickets' is both a global namespace and could be passed as a route namespace
    const result = pickRouteMessages(ALL_MESSAGES, ["tickets"]);

    expect(result).toHaveProperty("tickets");
    expect(result.tickets).toEqual({
      title: "Tickets",
      create: "Create Ticket",
    });
  });
});

// ---------------------------------------------------------------------------
// GLOBAL_NAMESPACES
// ---------------------------------------------------------------------------

describe("GLOBAL_NAMESPACES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(GLOBAL_NAMESPACES)).toBe(true);
    expect(GLOBAL_NAMESPACES.length).toBeGreaterThan(0);
  });

  it("contains expected core namespaces", () => {
    expect(GLOBAL_NAMESPACES).toContain("common");
    expect(GLOBAL_NAMESPACES).toContain("nav");
    expect(GLOBAL_NAMESPACES).toContain("tickets");
    expect(GLOBAL_NAMESPACES).toContain("calls");
    expect(GLOBAL_NAMESPACES).toContain("bugReport");
    expect(GLOBAL_NAMESPACES).toContain("notFound");
  });

  it("contains only strings", () => {
    GLOBAL_NAMESPACES.forEach((ns) => {
      expect(typeof ns).toBe("string");
    });
  });
});
