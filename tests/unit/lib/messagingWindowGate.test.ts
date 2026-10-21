/**
 * Messenger / Instagram reply-window gate (mirrors the mobile app's
 * windowBanner): normal within 24h, Human Agent banner 24h–7d on approved
 * workspaces, closed otherwise. Unknown windows never block.
 */
import { describe, it, expect } from "vitest";

import {
  isOutsideWindowError,
  windowBanner,
} from "@/components/messages-beta/composer/messagingWindowGate";

const LAST = "2026-10-15T10:00:00Z";

describe("windowBanner", () => {
  it("is none inside the 24h window", () => {
    expect(
      windowBanner("facebook", { window_open: true, human_agent_window_open: true, last_user_message_at: LAST })
    ).toEqual({ kind: "none" });
  });

  it("is none while the window is unknown", () => {
    expect(windowBanner("facebook", null)).toEqual({ kind: "none" });
    expect(windowBanner("instagram", undefined)).toEqual({ kind: "none" });
  });

  it("shows the Human Agent banner between 24h and 7 days, flooring the hours", () => {
    expect(
      windowBanner("facebook", {
        window_open: false,
        human_agent_window_open: true,
        human_agent_hours_remaining: 41.7,
        last_user_message_at: LAST,
      })
    ).toEqual({ kind: "humanAgent", hoursRemaining: 41 });
    expect(
      windowBanner("instagram", {
        window_open: false,
        human_agent_window_open: true,
        human_agent_hours_remaining: null,
        last_user_message_at: LAST,
      })
    ).toEqual({ kind: "humanAgent", hoursRemaining: null });
  });

  it("is closed after 7 days or without Human Agent", () => {
    expect(
      windowBanner("facebook", {
        window_open: false,
        human_agent_window_open: false,
        human_agent_hours_remaining: 0,
        last_user_message_at: LAST,
      })
    ).toEqual({ kind: "closed" });
  });

  it("does not block a thread with no customer message on record", () => {
    expect(windowBanner("facebook", { window_open: false, human_agent_window_open: false })).toEqual({
      kind: "none",
    });
  });

  it("never applies to other platforms", () => {
    const closed = { window_open: false, human_agent_window_open: false, last_user_message_at: LAST };
    expect(windowBanner("whatsapp", closed)).toEqual({ kind: "none" });
    expect(windowBanner("telegram", closed)).toEqual({ kind: "none" });
  });
});

describe("isOutsideWindowError", () => {
  it("recognises the backend's structured code", () => {
    expect(
      isOutsideWindowError({ response: { data: { code: "outside_messaging_window", error: "nope" } } })
    ).toBe(true);
  });

  it("recognises Meta's raw (#10) text from older backends", () => {
    expect(
      isOutsideWindowError({
        response: { data: { error: "(#10) This message is sent outside of allowed window." } },
      })
    ).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isOutsideWindowError({ response: { data: { error: "Page token expired" } } })).toBe(false);
    expect(isOutsideWindowError(new Error("Network Error"))).toBe(false);
    expect(isOutsideWindowError(undefined)).toBe(false);
  });
});
