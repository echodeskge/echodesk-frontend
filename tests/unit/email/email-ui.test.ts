import { describe, it, expect } from "vitest";

import { avatarTone, emailInitials, isTypingTarget, listTime, neighbourId } from "@/lib/email-ui";
import { emailTemplates } from "@/app/(tenant)/email/_components/email-template-picker";
import { buildInfiniteQueryParams } from "@/app/(tenant)/email/_components/email-list-content";
import type { QuickReply } from "@/hooks/api/useSocial";

describe("email-ui helpers", () => {
  it("gives the same sender the same avatar colour", () => {
    expect(avatarTone("Nino Beridze")).toBe(avatarTone("nino beridze"));
    expect(avatarTone("")).toMatch(/^bg-/);
  });

  it("builds two-letter initials from names and addresses", () => {
    expect(emailInitials("Nino Beridze")).toBe("NB");
    expect(emailInitials("info@company.ge")).toBe("IN");
    expect(emailInitials("john.doe@x.com")).toBe("JD");
    expect(emailInitials("")).toBe("?");
  });

  it("formats list times: today, this year, older", () => {
    const now = new Date(2026, 10, 8, 18, 0);
    expect(listTime(new Date(2026, 10, 8, 9, 5).toISOString(), "en-GB", now)).toBe("09:05");
    expect(listTime(new Date(2026, 2, 12, 9, 5).toISOString(), "en-GB", now)).toBe("12 Mar");
    expect(listTime(new Date(2026, 2, 12, 9, 5).toISOString(), "ka", now)).toBe("12 მარ");
    expect(listTime(new Date(2024, 2, 12, 9, 5).toISOString(), "en-GB", now)).toBe("12.03.2024");
    expect(listTime(null, "en", now)).toBe("");
  });

  it("finds the newer / older neighbour in the list", () => {
    expect(neighbourId([3, 7, 9], 7, 1)).toBe(9);
    expect(neighbourId([3, 7, 9], 7, -1)).toBe(3);
    expect(neighbourId([3, 7, 9], 9, 1)).toBeNull();
    expect(neighbourId([3, 7, 9], null, 1)).toBe(3);
    expect(neighbourId([3, 7, 9], 42, 1)).toBe(3);
    expect(neighbourId([], 1, 1)).toBeNull();
  });

  it("detects typing targets", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("div"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("keeps only email (or all-platform) templates", () => {
    const replies = [
      { id: 1, platforms: ["email"] },
      { id: 2, platforms: ["whatsapp"] },
      { id: 3, platforms: [] },
      { id: 4, platforms: ["all"] },
    ] as unknown as QuickReply[];
    expect(emailTemplates(replies).map((r) => r.id)).toEqual([1, 3, 4]);
  });

  it("builds list query params for folders, views, unread and search", () => {
    expect(buildInfiniteQueryParams("INBOX", 2, "abc", true)).toEqual({
      folder: "INBOX",
      is_read: false,
      connection_id: 2,
      search: "abc",
    });
    expect(buildInfiniteQueryParams("assigned", null)).toEqual({ view: "assigned_to_me" });
    expect(buildInfiniteQueryParams("ticketed", null)).toEqual({ view: "ticketed" });
    expect(buildInfiniteQueryParams("starred", null)).toEqual({ starred: true });
    expect(buildInfiniteQueryParams("drafts", null)).toEqual({});
  });
});
