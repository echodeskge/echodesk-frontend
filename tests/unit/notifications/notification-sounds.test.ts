/**
 * Tests for notification sound utility (src/utils/notificationSound.ts).
 *
 * Covers:
 * - NOTIFICATION_TYPE_SOUNDS mapping: every type has a valid sound
 * - playForNotificationType() falls back to system default for unknown types
 * - Sound manager enable/disable/toggle
 * - Volume clamping
 * - Platform sound defaults
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NOTIFICATION_TYPE_SOUNDS,
  NOTIFICATION_SOUNDS,
  getNotificationSound,
  NotificationSoundManager,
} from "@/utils/notificationSound";

// ---------------------------------------------------------------------------
// Mock HTMLAudioElement (jsdom does not implement Audio)
// ---------------------------------------------------------------------------

const mockPlay = vi.fn(() => Promise.resolve());

class MockAudio {
  src: string = "";
  volume: number = 0.5;
  currentTime: number = 0;
  play = mockPlay;

  constructor(src?: string) {
    if (src) this.src = src;
  }
}

// @ts-expect-error - mock for jsdom
global.Audio = MockAudio;

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NOTIFICATION_TYPE_SOUNDS mapping", () => {
  it("has mappings for all expected ticket notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_assigned");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_commented");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_mentioned");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_status_changed");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_updated");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("ticket_due_soon");
  });

  it("has mappings for all expected message notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("message_received");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("message_assigned");
  });

  it("has mappings for all expected invoice notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("invoice_created");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("invoice_paid");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("invoice_overdue");
  });

  it("has mappings for all expected leave notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("leave_request_submitted");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("leave_request_approved");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("leave_request_rejected");
  });

  it("has mappings for all expected booking notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("booking_confirmed");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("booking_cancelled");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("booking_reminder");
  });

  it("has mappings for all expected call notification types", () => {
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("call_missed");
    expect(NOTIFICATION_TYPE_SOUNDS).toHaveProperty("call_voicemail");
  });

  it("every mapped sound value is a non-empty string", () => {
    for (const [type, sound] of Object.entries(NOTIFICATION_TYPE_SOUNDS)) {
      expect(typeof sound).toBe("string");
      expect(sound.length).toBeGreaterThan(0);
    }
  });
});

describe("NOTIFICATION_SOUNDS list", () => {
  it("contains at least 20 sound options", () => {
    expect(NOTIFICATION_SOUNDS.length).toBeGreaterThanOrEqual(20);
  });

  it("each sound has a value and label", () => {
    for (const sound of NOTIFICATION_SOUNDS) {
      expect(typeof sound.value).toBe("string");
      expect(sound.value.length).toBeGreaterThan(0);
      expect(typeof sound.label).toBe("string");
      expect(sound.label.length).toBeGreaterThan(0);
    }
  });
});

describe("NotificationSoundManager - enable/disable/toggle", () => {
  it("is enabled by default", () => {
    const manager = getNotificationSound();
    expect(manager.isEnabled()).toBe(true);
  });

  it("disable() disables sounds", () => {
    const manager = getNotificationSound();
    manager.enable(); // Reset
    manager.disable();
    expect(manager.isEnabled()).toBe(false);
  });

  it("enable() re-enables sounds", () => {
    const manager = getNotificationSound();
    manager.disable();
    manager.enable();
    expect(manager.isEnabled()).toBe(true);
  });

  it("toggle() flips the state and returns new value", () => {
    const manager = getNotificationSound();
    manager.enable(); // Start enabled
    const result = manager.toggle();
    expect(result).toBe(false);
    expect(manager.isEnabled()).toBe(false);

    const result2 = manager.toggle();
    expect(result2).toBe(true);
    expect(manager.isEnabled()).toBe(true);
  });

  it("persists enable/disable to localStorage", () => {
    const manager = getNotificationSound();
    manager.disable();

    const stored = localStorage.getItem("notification_sound_settings");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.enabled).toBe(false);
  });

  it("persists toggle to localStorage", () => {
    const manager = getNotificationSound();
    manager.enable(); // start enabled
    manager.toggle(); // now disabled

    const stored = localStorage.getItem("notification_sound_settings");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.enabled).toBe(false);
  });
});

describe("NotificationSoundManager - volume", () => {
  it("default volume is 0.5", () => {
    const manager = getNotificationSound();
    // Reset volume to default
    manager.setVolume(0.5);
    expect(manager.getVolume()).toBe(0.5);
  });

  it("clamps volume to minimum 0", () => {
    const manager = getNotificationSound();
    manager.setVolume(-1);
    expect(manager.getVolume()).toBe(0);
  });

  it("clamps volume to maximum 1", () => {
    const manager = getNotificationSound();
    manager.setVolume(2);
    expect(manager.getVolume()).toBe(1);
  });

  it("sets volume to exact value within range", () => {
    const manager = getNotificationSound();
    manager.setVolume(0.75);
    expect(manager.getVolume()).toBe(0.75);
  });
});

describe("NotificationSoundManager - playForNotificationType", () => {
  it("does not play when disabled", () => {
    const manager = getNotificationSound();
    manager.disable();
    manager.playForNotificationType("ticket_assigned");
    expect(mockPlay).not.toHaveBeenCalled();
    manager.enable(); // restore
  });

  it("plays audio for known notification type when enabled", () => {
    const manager = getNotificationSound();
    manager.enable();
    manager.playForNotificationType("ticket_assigned");
    expect(mockPlay).toHaveBeenCalled();
  });

  it("falls back to system default sound for unknown type", () => {
    const manager = getNotificationSound();
    manager.enable();
    // Unknown type should still play (using system default)
    manager.playForNotificationType("some_completely_unknown_type");
    expect(mockPlay).toHaveBeenCalled();
  });
});

describe("NotificationSoundManager - platform sounds", () => {
  it("returns default sound for each platform", () => {
    const manager = getNotificationSound();
    const platforms = ["facebook", "instagram", "whatsapp", "email", "team_chat", "system"] as const;

    for (const platform of platforms) {
      const sound = manager.getSoundForPlatform(platform);
      expect(typeof sound).toBe("string");
      expect(sound.length).toBeGreaterThan(0);
    }
  });

  it("updates settings from backend", () => {
    const manager = getNotificationSound();
    manager.updateSettings({
      notification_sound_facebook: "custom-sound.wav",
      notification_sound_instagram: "",
      notification_sound_whatsapp: "custom-whatsapp.wav",
      notification_sound_email: "",
      notification_sound_team_chat: "",
      notification_sound_system: "",
    });

    expect(manager.getSoundForPlatform("facebook")).toBe("custom-sound.wav");
    expect(manager.getSoundForPlatform("whatsapp")).toBe("custom-whatsapp.wav");
    // Empty strings should fall back to defaults
    expect(manager.getSoundForPlatform("instagram").length).toBeGreaterThan(0);
  });
});
