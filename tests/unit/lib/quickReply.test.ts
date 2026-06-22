import { describe, it, expect } from "vitest";

import { matchQuickReplies, processQuickReplyMessage } from "@/lib/quickReply";
import type { QuickReply } from "@/hooks/api/useSocial";

function makeQR(overrides: Partial<QuickReply> = {}): QuickReply {
  return {
    id: 1,
    title: "Greeting",
    message: "Hello there",
    platforms: ["all"],
    shortcut: "",
    category: "",
    use_count: 0,
    position: 0,
    created_by: null,
    created_by_name: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("matchQuickReplies", () => {
  it("returns [] for empty or sub-2-char queries", () => {
    const list = [makeQR()];
    expect(matchQuickReplies(list, "")).toEqual([]);
    expect(matchQuickReplies(list, "  ")).toEqual([]);
    expect(matchQuickReplies(list, "h")).toEqual([]);
  });

  it("handles undefined / null input", () => {
    expect(matchQuickReplies(undefined, "hello")).toEqual([]);
    expect(matchQuickReplies(null, "hello")).toEqual([]);
  });

  it("matches by message substring (the screenshot case)", () => {
    const a = makeQR({ id: 1, title: "Help", message: "რით შეგვიძლია, დაგეხმაროთ?" });
    const b = makeQR({ id: 2, title: "Bye", message: "Goodbye" });
    expect(matchQuickReplies([a, b], "რით შე").map((r) => r.id)).toEqual([1]);
  });

  it("matches by title", () => {
    const a = makeQR({ id: 1, title: "Greeting", message: "x" });
    expect(matchQuickReplies([a], "gree").map((r) => r.id)).toEqual([1]);
  });

  it("matches a /shortcut by prefix only", () => {
    const a = makeQR({ id: 1, title: "Thanks", message: "Thank you", shortcut: "thanks" });
    const b = makeQR({ id: 2, title: "Other", message: "no", shortcut: "thx" });
    expect(matchQuickReplies([a, b], "/than").map((r) => r.id)).toEqual([1]);
    expect(matchQuickReplies([a, b], "/")).toEqual([]); // slash with no body
  });

  it("excludes a reply whose message is already fully typed", () => {
    const a = makeQR({ id: 1, message: "Hello there" });
    expect(matchQuickReplies([a], "Hello there")).toEqual([]);
  });

  it("ranks shortcut/title prefix above message-contains", () => {
    const msgHit = makeQR({ id: 1, title: "Z", message: "please thanks here" }); // contains
    const titleHit = makeQR({ id: 2, title: "thanks team", message: "y" }); // title prefix
    const scHit = makeQR({ id: 3, title: "W", message: "y", shortcut: "thanks" }); // shortcut prefix
    expect(matchQuickReplies([msgHit, titleHit, scHit], "thanks").map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("caps results at the limit", () => {
    const list = Array.from({ length: 6 }, (_, i) =>
      makeQR({ id: i + 1, title: `match ${i}`, message: "m" })
    );
    expect(matchQuickReplies(list, "match", 3)).toHaveLength(3);
  });
});

describe("processQuickReplyMessage", () => {
  it("substitutes customer / agent / company variables", () => {
    const out = processQuickReplyMessage(
      "Hi {{customer_name}}, I'm {{agent_name}} from {{company_name}}",
      { customerName: "Nino", agentName: "Liza", companyName: "Amanati" }
    );
    expect(out).toBe("Hi Nino, I'm Liza from Amanati");
  });

  it("substitutes date/time and leaves no template tokens behind", () => {
    const out = processQuickReplyMessage("On {{current_date}} at {{current_time}}");
    expect(out).not.toContain("{{current_date}}");
    expect(out).not.toContain("{{current_time}}");
  });
});
