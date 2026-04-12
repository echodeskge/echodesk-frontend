/**
 * Tests for notification preference helpers.
 * Verifies getNotificationPreference() and getNotificationPreferenceByType()
 * exported from NotificationPreferences.tsx.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  getNotificationPreference,
  getNotificationPreferenceByType,
} from "@/components/NotificationPreferences";

const STORAGE_KEY = "notification_preferences";

describe("getNotificationPreference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("default preferences (no localStorage)", () => {
    it("returns true for all channels by default", () => {
      expect(getNotificationPreference("tickets", "assigned", "inApp")).toBe(
        true
      );
      expect(getNotificationPreference("tickets", "assigned", "sound")).toBe(
        true
      );
      expect(getNotificationPreference("tickets", "assigned", "push")).toBe(
        true
      );
    });

    it("returns true for all ticket sub-types by default", () => {
      expect(
        getNotificationPreference("tickets", "commented", "inApp")
      ).toBe(true);
      expect(
        getNotificationPreference("tickets", "mentioned", "sound")
      ).toBe(true);
      expect(
        getNotificationPreference("tickets", "status_changed", "push")
      ).toBe(true);
    });

    it("returns true for messages by default", () => {
      expect(
        getNotificationPreference("messages", "new_message", "inApp")
      ).toBe(true);
      expect(
        getNotificationPreference("messages", "message_assigned", "push")
      ).toBe(true);
    });

    it("returns true for invoices by default", () => {
      expect(
        getNotificationPreference("invoices", "created", "inApp")
      ).toBe(true);
      expect(getNotificationPreference("invoices", "paid", "sound")).toBe(
        true
      );
      expect(getNotificationPreference("invoices", "overdue", "push")).toBe(
        true
      );
    });

    it("returns true for leave by default", () => {
      expect(
        getNotificationPreference("leave", "submitted", "inApp")
      ).toBe(true);
    });

    it("returns true for bookings by default", () => {
      expect(
        getNotificationPreference("bookings", "confirmed", "inApp")
      ).toBe(true);
      expect(
        getNotificationPreference("bookings", "reminder", "push")
      ).toBe(true);
    });

    it("returns true for calls by default", () => {
      expect(getNotificationPreference("calls", "missed", "inApp")).toBe(
        true
      );
      expect(
        getNotificationPreference("calls", "voicemail", "push")
      ).toBe(true);
    });
  });

  describe("custom preferences from localStorage", () => {
    it("reads disabled preference from localStorage", () => {
      const prefs = {
        tickets: {
          assigned: { inApp: false, sound: true, push: true },
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

      expect(
        getNotificationPreference("tickets", "assigned", "inApp")
      ).toBe(false);
      expect(
        getNotificationPreference("tickets", "assigned", "sound")
      ).toBe(true);
    });

    it("disables multiple channels", () => {
      const prefs = {
        tickets: {
          assigned: { inApp: true, sound: true, push: true },
          commented: { inApp: true, sound: true, push: true },
          mentioned: { inApp: true, sound: true, push: true },
          status_changed: { inApp: true, sound: true, push: true },
        },
        messages: {
          new_message: { inApp: false, sound: false, push: false },
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

      expect(
        getNotificationPreference("messages", "new_message", "inApp")
      ).toBe(false);
      expect(
        getNotificationPreference("messages", "new_message", "sound")
      ).toBe(false);
      expect(
        getNotificationPreference("messages", "new_message", "push")
      ).toBe(false);
    });

    it("merges with defaults for missing categories", () => {
      // Only partial data in localStorage (missing some categories)
      const partialPrefs = {
        tickets: {
          assigned: { inApp: false, sound: false, push: false },
          commented: { inApp: true, sound: true, push: true },
          mentioned: { inApp: true, sound: true, push: true },
          status_changed: { inApp: true, sound: true, push: true },
        },
        // Missing messages, invoices, leave, bookings, calls
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(partialPrefs));

      // Tickets should use stored value
      expect(
        getNotificationPreference("tickets", "assigned", "inApp")
      ).toBe(false);

      // Missing categories should fall back to defaults (all true)
      expect(
        getNotificationPreference("messages", "new_message", "inApp")
      ).toBe(true);
      expect(getNotificationPreference("calls", "missed", "push")).toBe(
        true
      );
    });

    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "not valid json!!!{{}");

      // Should fall back to defaults
      expect(
        getNotificationPreference("tickets", "assigned", "inApp")
      ).toBe(true);
    });

    it("returns true for unknown sub-type (defaults via ??)", () => {
      // If we somehow query a category/subtype that doesn't exist
      expect(
        getNotificationPreference("tickets", "nonexistent_subtype", "inApp")
      ).toBe(true);
    });
  });
});

describe("getNotificationPreferenceByType", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("known notification types", () => {
    it("maps ticket_assigned to tickets.assigned", () => {
      const pref = getNotificationPreferenceByType("ticket_assigned");

      expect(pref.inApp).toBe(true);
      expect(pref.sound).toBe(true);
      expect(pref.push).toBe(true);
    });

    it("maps ticket_commented to tickets.commented", () => {
      const pref = getNotificationPreferenceByType("ticket_commented");
      expect(pref.inApp).toBe(true);
    });

    it("maps message_received to messages.new_message", () => {
      const pref = getNotificationPreferenceByType("message_received");
      expect(pref.inApp).toBe(true);
    });

    it("maps invoice_paid to invoices.paid", () => {
      const pref = getNotificationPreferenceByType("invoice_paid");
      expect(pref.inApp).toBe(true);
    });

    it("maps leave_request_submitted to leave.submitted", () => {
      const pref = getNotificationPreferenceByType("leave_request_submitted");
      expect(pref.inApp).toBe(true);
    });

    it("maps booking_confirmed to bookings.confirmed", () => {
      const pref = getNotificationPreferenceByType("booking_confirmed");
      expect(pref.inApp).toBe(true);
    });

    it("maps call_missed to calls.missed", () => {
      const pref = getNotificationPreferenceByType("call_missed");
      expect(pref.inApp).toBe(true);
    });
  });

  describe("unknown notification types", () => {
    it("returns all-true defaults for unknown type", () => {
      const pref = getNotificationPreferenceByType("some_unknown_type");

      expect(pref.inApp).toBe(true);
      expect(pref.sound).toBe(true);
      expect(pref.push).toBe(true);
    });

    it("returns all-true defaults for empty string", () => {
      const pref = getNotificationPreferenceByType("");

      expect(pref.inApp).toBe(true);
      expect(pref.sound).toBe(true);
      expect(pref.push).toBe(true);
    });
  });

  describe("with custom localStorage preferences", () => {
    it("returns stored preferences for known type", () => {
      const prefs = {
        tickets: {
          assigned: { inApp: false, sound: false, push: true },
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

      const pref = getNotificationPreferenceByType("ticket_assigned");
      expect(pref.inApp).toBe(false);
      expect(pref.sound).toBe(false);
      expect(pref.push).toBe(true);
    });
  });
});
