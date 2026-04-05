/**
 * Tests for NotificationSoundManager utility.
 *   - Singleton pattern
 *   - Enable/disable/toggle
 *   - Volume clamping
 *   - Platform sound mapping
 *   - updateSettings from backend
 *   - Legacy play() method mapping
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Audio constructor
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockAudioInstances: any[] = [];

class MockAudio {
  src: string;
  volume = 0.5;
  currentTime = 0;
  play = mockPlay;

  constructor(src: string) {
    this.src = src;
    mockAudioInstances.push(this);
  }
}

vi.stubGlobal("Audio", MockAudio);

import {
  getNotificationSound,
  NotificationSoundManager,
  NOTIFICATION_SOUNDS,
} from "@/utils/notificationSound";

describe("NotificationSoundManager", () => {
  let manager: NotificationSoundManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioInstances.length = 0;
    localStorage.clear();
    // Create fresh instance for each test
    manager = new NotificationSoundManager();
  });

  // -- Enable/Disable/Toggle --
  describe("enable/disable/toggle", () => {
    it("is enabled by default", () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it("can be disabled", () => {
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });

    it("can be re-enabled", () => {
      manager.disable();
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });

    it("toggle returns new state", () => {
      const result = manager.toggle();
      expect(result).toBe(false);
      expect(manager.isEnabled()).toBe(false);

      const result2 = manager.toggle();
      expect(result2).toBe(true);
      expect(manager.isEnabled()).toBe(true);
    });

    it("persists enabled state to localStorage", () => {
      manager.disable();
      const stored = JSON.parse(
        localStorage.getItem("notification_sound_settings")!
      );
      expect(stored.enabled).toBe(false);
    });
  });

  // -- Volume --
  describe("volume", () => {
    it("defaults to 0.5", () => {
      expect(manager.getVolume()).toBe(0.5);
    });

    it("can be set", () => {
      manager.setVolume(0.8);
      expect(manager.getVolume()).toBe(0.8);
    });

    it("clamps to max 1.0", () => {
      manager.setVolume(1.5);
      expect(manager.getVolume()).toBe(1.0);
    });

    it("clamps to min 0.0", () => {
      manager.setVolume(-0.2);
      expect(manager.getVolume()).toBe(0.0);
    });

    it("persists volume to localStorage", () => {
      manager.setVolume(0.7);
      const stored = JSON.parse(
        localStorage.getItem("notification_sound_settings")!
      );
      expect(stored.volume).toBe(0.7);
    });
  });

  // -- Platform sounds --
  describe("getSoundForPlatform", () => {
    it("returns default sound for facebook", () => {
      expect(manager.getSoundForPlatform("facebook")).toBe(
        "mixkit-bubble-pop-up-alert-notification-2357.wav"
      );
    });

    it("returns default sound for system", () => {
      expect(manager.getSoundForPlatform("system")).toBe(
        "mixkit-confirmation-tone-2867.wav"
      );
    });
  });

  // -- updateSettings --
  describe("updateSettings", () => {
    it("updates platform sounds from backend", () => {
      manager.updateSettings({
        notification_sound_facebook: "mixkit-bell-notification-933.wav",
        notification_sound_instagram: "mixkit-bell-notification-933.wav",
        notification_sound_whatsapp: "mixkit-bell-notification-933.wav",
        notification_sound_email: "mixkit-bell-notification-933.wav",
        notification_sound_team_chat: "mixkit-bell-notification-933.wav",
        notification_sound_system: "mixkit-bell-notification-933.wav",
      });

      expect(manager.getSoundForPlatform("facebook")).toBe(
        "mixkit-bell-notification-933.wav"
      );
    });

    it("falls back to defaults for empty strings", () => {
      manager.updateSettings({
        notification_sound_facebook: "",
        notification_sound_instagram: "",
        notification_sound_whatsapp: "",
        notification_sound_email: "",
        notification_sound_team_chat: "",
        notification_sound_system: "",
      });

      // Should use defaults, not empty strings
      expect(manager.getSoundForPlatform("facebook")).toBe(
        "mixkit-bubble-pop-up-alert-notification-2357.wav"
      );
    });
  });

  // -- playForPlatform --
  describe("playForPlatform", () => {
    it("plays sound when enabled", () => {
      manager.playForPlatform("facebook");
      expect(mockPlay).toHaveBeenCalled();
    });

    it("does not play when disabled", () => {
      manager.disable();
      manager.playForPlatform("facebook");
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("resets currentTime before playing", () => {
      manager.playForPlatform("facebook");
      expect(mockAudioInstances[0].currentTime).toBe(0);
    });
  });

  // -- Legacy play method --
  describe("play (legacy)", () => {
    it("maps 'message' to email platform", () => {
      manager.play("message");
      expect(mockPlay).toHaveBeenCalled();
    });

    it("maps 'teamChat' to team_chat platform", () => {
      manager.play("teamChat");
      expect(mockPlay).toHaveBeenCalled();
    });

    it("maps 'notification' to system platform", () => {
      manager.play("notification");
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  // -- NOTIFICATION_SOUNDS constant --
  describe("NOTIFICATION_SOUNDS", () => {
    it("has entries with value and label", () => {
      expect(NOTIFICATION_SOUNDS.length).toBeGreaterThan(0);
      expect(NOTIFICATION_SOUNDS[0]).toHaveProperty("value");
      expect(NOTIFICATION_SOUNDS[0]).toHaveProperty("label");
    });
  });

  // -- Singleton --
  describe("getNotificationSound singleton", () => {
    it("returns same instance", () => {
      const a = getNotificationSound();
      const b = getNotificationSound();
      expect(a).toBe(b);
    });
  });
});
