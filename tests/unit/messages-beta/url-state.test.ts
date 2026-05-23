/**
 * Tests for the /messages-beta URL ↔ store-slice translators (PR G).
 * Pure helpers — no DOM, no React.
 */
import { describe, it, expect } from "vitest";

import {
  readFiltersFromSearch,
  snapshotsEqual,
  writeFiltersToSearch,
} from "@/components/messages-beta/url-state";

describe("readFiltersFromSearch", () => {
  it("returns defaults for empty query string", () => {
    expect(readFiltersFromSearch("")).toEqual({
      assignmentTab: "all",
      showArchived: false,
      platformFilter: null,
    });
  });

  it("parses ?tab=assigned + ?view=history + ?platform=whatsapp", () => {
    expect(readFiltersFromSearch("?tab=assigned&view=history&platform=whatsapp")).toEqual({
      assignmentTab: "assigned",
      showArchived: true,
      platformFilter: "whatsapp",
    });
  });

  it("falls back to defaults for unknown values (defensive against bad share links)", () => {
    expect(readFiltersFromSearch("?tab=nonsense&view=garbage&platform=tiktok")).toEqual({
      assignmentTab: "all",
      showArchived: false,
      platformFilter: null,
    });
  });

  it("preserves unrelated params during parsing", () => {
    // Only the three keys we care about; ?account=x is left alone elsewhere.
    expect(readFiltersFromSearch("?account=5&platform=facebook")).toMatchObject({
      platformFilter: "facebook",
    });
  });
});

describe("writeFiltersToSearch", () => {
  it("emits empty string when everything is default (clean URL for common view)", () => {
    expect(
      writeFiltersToSearch("", {
        assignmentTab: "all",
        showArchived: false,
        platformFilter: null,
      })
    ).toBe("");
  });

  it("serialises a non-default snapshot", () => {
    const out = writeFiltersToSearch("", {
      assignmentTab: "assigned",
      showArchived: true,
      platformFilter: "whatsapp",
    });
    const params = new URLSearchParams(out);
    expect(params.get("tab")).toBe("assigned");
    expect(params.get("view")).toBe("history");
    expect(params.get("platform")).toBe("whatsapp");
  });

  it("strips a previously-set param when flipping back to default", () => {
    const out = writeFiltersToSearch("?tab=assigned&view=history&platform=facebook", {
      assignmentTab: "all",
      showArchived: false,
      platformFilter: null,
    });
    expect(out).toBe("");
  });

  it("preserves unrelated params (?id catch-all, ?account, …) untouched", () => {
    const out = writeFiltersToSearch("?account=5&id=fb_p_1", {
      assignmentTab: "assigned",
      showArchived: false,
      platformFilter: "facebook",
    });
    const params = new URLSearchParams(out);
    expect(params.get("account")).toBe("5");
    expect(params.get("id")).toBe("fb_p_1");
    expect(params.get("tab")).toBe("assigned");
    expect(params.get("platform")).toBe("facebook");
    expect(params.get("view")).toBeNull();
  });

  it("write → read roundtrip yields the same snapshot", () => {
    const snap = {
      assignmentTab: "assigned" as const,
      showArchived: true,
      platformFilter: "instagram" as const,
    };
    const written = writeFiltersToSearch("", snap);
    expect(readFiltersFromSearch(`?${written}`)).toEqual(snap);
  });
});

describe("snapshotsEqual", () => {
  it("identical snapshots compare equal", () => {
    const a = { assignmentTab: "all" as const, showArchived: false, platformFilter: null };
    expect(snapshotsEqual(a, { ...a })).toBe(true);
  });

  it("any difference in a slice flips equality", () => {
    const base = { assignmentTab: "all" as const, showArchived: false, platformFilter: null };
    expect(snapshotsEqual(base, { ...base, assignmentTab: "assigned" })).toBe(false);
    expect(snapshotsEqual(base, { ...base, showArchived: true })).toBe(false);
    expect(snapshotsEqual(base, { ...base, platformFilter: "facebook" })).toBe(false);
  });
});
