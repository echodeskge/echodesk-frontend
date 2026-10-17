/**
 * Tests for syncPreferredLanguage: the web language switch also stores the
 * signed-in user's notification language (User.preferred_language) via
 * PATCH /api/auth/profile/update/ — best effort, never throwing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const patch = vi.hoisted(() => vi.fn());
vi.mock("@/api/axios", () => ({ default: { patch } }));

import { syncPreferredLanguage } from "@/lib/preferredLanguage";

describe("syncPreferredLanguage", () => {
  beforeEach(() => {
    patch.mockReset();
    localStorage.clear();
  });

  it("PATCHes the profile with the new language when signed in", async () => {
    localStorage.setItem("echodesk_auth_token", "tok");
    patch.mockResolvedValue({ data: {} });

    await expect(syncPreferredLanguage("ka")).resolves.toBe(true);
    expect(patch).toHaveBeenCalledWith("/api/auth/profile/update/", {
      preferred_language: "ka",
    });
  });

  it("does nothing when nobody is signed in", async () => {
    await expect(syncPreferredLanguage("en")).resolves.toBe(false);
    expect(patch).not.toHaveBeenCalled();
  });

  it("ignores unsupported locales", async () => {
    localStorage.setItem("echodesk_auth_token", "tok");
    await expect(syncPreferredLanguage("de")).resolves.toBe(false);
    expect(patch).not.toHaveBeenCalled();
  });

  it("swallows request errors", async () => {
    localStorage.setItem("echodesk_auth_token", "tok");
    patch.mockRejectedValue(new Error("network"));
    await expect(syncPreferredLanguage("en")).resolves.toBe(false);
  });
});
