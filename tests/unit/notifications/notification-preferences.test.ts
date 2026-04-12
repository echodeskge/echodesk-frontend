/**
 * Tests for notification preference logic (pure functions from NotificationPreferences.tsx).
 *
 * Covers:
 * - Default preferences (all categories, all channels enabled)
 * - Custom preferences stored/loaded from localStorage
 * - getNotificationPreferenceByType() mapping from notification_type to category
 * - Unknown types default to all-enabled
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getNotificationPreference,
  getNotificationPreferenceByType,
} from "@/components/NotificationPreferences";

// ---------------------------------------------------------------------------
// Types (mirror the internal types from NotificationPreferences.tsx)
// ---------------------------------------------------------------------------

interface ChannelPreference {
  inApp: boolean;
  sound: boolean;
  push: boolean;
}

interface CategoryPreference {
  [subType: string]: ChannelPreference;
}

interface NotificationPreferences {
  tickets: CategoryPreference;
  messages: CategoryPreference;
  invoices: CategoryPreference;
  leave: CategoryPreference;
  bookings: CategoryPreference;
  calls: CategoryPreference;
}

const STORAGE_KEY = "notification_preferences";

// ---------------------------------------------------------------------------
// Helper: build a default preferences object (mirrors the source)
// ---------------------------------------------------------------------------

function defaultPreferences(): NotificationPreferences {
  return {
    tickets: {
      assigned: { inApp: true, sound: true, push: true },
      commented: { inApp: true, sound: true, push: true },
      mentioned: { inApp: true, sound: true, push: true },
      status_changed: { inApp: true, sound: true, push: true },
    },
    messages: {
      new_message: { inApp: true, sound: true, push: true },
      message_assigned: { inApp: true, sound: true, push: true },
    },
    invoices: {
      created: { inApp: true, sound: true, push: true },
      paid: { inApp: true, sound: true, push: true },
      overdue: { inApp: true, sound: true, push: true },
    },
    leave: {
      submitted: { inApp: true, sound: true, push: true },
      approved: { inApp: true, sound: true, push: true },
      rejected: { inApp: true, sound: true, push: true },
    },
    bookings: {
      confirmed: { inApp: true, sound: true, push: true },
      cancelled: { inApp: true, sound: true, push: true },
      reminder: { inApp: true, sound: true, push: true },
    },
    calls: {
      missed: { inApp: true, sound: true, push: true },
      voicemail: { inApp: true, sound: true, push: true },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Notification Preferences - Defaults", () => {
  it("all categories and channels are enabled by default when no localStorage entry exists", () => {
    const pref = getNotificationPreferenceByType("ticket_assigned");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });

  it("returns all-true for every known notification type when localStorage is empty", () => {
    const knownTypes = [
      "ticket_assigned",
      "ticket_commented",
      "ticket_mentioned",
      "ticket_status_changed",
      "ticket_updated",
      "ticket_due_soon",
      "message_received",
      "message_assigned",
      "invoice_created",
      "invoice_paid",
      "invoice_overdue",
      "leave_request_submitted",
      "leave_request_approved",
      "leave_request_rejected",
      "booking_confirmed",
      "booking_cancelled",
      "booking_reminder",
      "call_missed",
      "call_voicemail",
    ];

    for (const type of knownTypes) {
      const pref = getNotificationPreferenceByType(type);
      expect(pref.inApp).toBe(true);
      expect(pref.sound).toBe(true);
      expect(pref.push).toBe(true);
    }
  });

  it("getNotificationPreference returns true for every default category/subType/channel combo", () => {
    expect(getNotificationPreference("tickets", "assigned", "inApp")).toBe(true);
    expect(getNotificationPreference("tickets", "assigned", "sound")).toBe(true);
    expect(getNotificationPreference("tickets", "assigned", "push")).toBe(true);
    expect(getNotificationPreference("messages", "new_message", "inApp")).toBe(true);
    expect(getNotificationPreference("invoices", "overdue", "push")).toBe(true);
    expect(getNotificationPreference("calls", "missed", "sound")).toBe(true);
  });
});

describe("Notification Preferences - Custom stored values", () => {
  it("reads custom disabled preference from localStorage", () => {
    const prefs = defaultPreferences();
    prefs.tickets.assigned.sound = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("ticket_assigned");
    expect(pref.sound).toBe(false);
    expect(pref.inApp).toBe(true);
    expect(pref.push).toBe(true);
  });

  it("reads multiple disabled channels from localStorage", () => {
    const prefs = defaultPreferences();
    prefs.invoices.overdue.inApp = false;
    prefs.invoices.overdue.push = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("invoice_overdue");
    expect(pref.inApp).toBe(false);
    expect(pref.sound).toBe(true);
    expect(pref.push).toBe(false);
  });

  it("merges with defaults when stored preferences miss a newly added category", () => {
    // Simulate old stored preferences that are missing the 'calls' category
    const prefs = defaultPreferences();
    const incomplete = { ...prefs } as Record<string, unknown>;
    delete incomplete.calls;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incomplete));

    // Should still return defaults for calls
    const pref = getNotificationPreferenceByType("call_missed");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });

  it("merges with defaults when stored preferences miss a newly added subType", () => {
    const prefs = defaultPreferences();
    // Remove a sub-type to simulate old schema
    delete prefs.tickets.status_changed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("ticket_status_changed");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });

  it("falls back to defaults when localStorage has invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");

    const pref = getNotificationPreferenceByType("ticket_assigned");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });
});

describe("Notification Preferences - getNotificationPreferenceByType mapping", () => {
  it("maps ticket_assigned to tickets.assigned", () => {
    const prefs = defaultPreferences();
    prefs.tickets.assigned.inApp = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("ticket_assigned");
    expect(pref.inApp).toBe(false);
  });

  it("maps ticket_updated to tickets.status_changed", () => {
    const prefs = defaultPreferences();
    prefs.tickets.status_changed.sound = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    // ticket_updated maps to category=tickets, subType=status_changed
    const pref = getNotificationPreferenceByType("ticket_updated");
    expect(pref.sound).toBe(false);
  });

  it("maps ticket_due_soon to tickets.status_changed", () => {
    const prefs = defaultPreferences();
    prefs.tickets.status_changed.push = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("ticket_due_soon");
    expect(pref.push).toBe(false);
  });

  it("maps message_received to messages.new_message", () => {
    const prefs = defaultPreferences();
    prefs.messages.new_message.inApp = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("message_received");
    expect(pref.inApp).toBe(false);
  });

  it("maps leave_request_submitted to leave.submitted", () => {
    const prefs = defaultPreferences();
    prefs.leave.submitted.sound = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("leave_request_submitted");
    expect(pref.sound).toBe(false);
  });

  it("maps booking_confirmed to bookings.confirmed", () => {
    const prefs = defaultPreferences();
    prefs.bookings.confirmed.push = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("booking_confirmed");
    expect(pref.push).toBe(false);
  });

  it("maps call_voicemail to calls.voicemail", () => {
    const prefs = defaultPreferences();
    prefs.calls.voicemail.inApp = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    const pref = getNotificationPreferenceByType("call_voicemail");
    expect(pref.inApp).toBe(false);
  });
});

describe("Notification Preferences - Unknown types", () => {
  it("returns all-enabled for completely unknown notification type", () => {
    const pref = getNotificationPreferenceByType("some_random_type");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });

  it("returns all-enabled for empty string", () => {
    const pref = getNotificationPreferenceByType("");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });

  it("returns all-enabled for undefined-like string", () => {
    const pref = getNotificationPreferenceByType("undefined");
    expect(pref).toEqual({ inApp: true, sound: true, push: true });
  });
});
