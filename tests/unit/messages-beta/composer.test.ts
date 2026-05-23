/**
 * Tests for the /messages-beta composer's per-platform dispatcher.
 *
 * After PR C, sendForPlatform takes File[] and an optional reply_to_message_id.
 * Verifies the per-platform URL + payload shape and the multi-file fan-out.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { sendForPlatform } from "@/components/messages-beta/composer/MessagesBetaComposer";
import type { ConversationRow } from "@/components/messages-beta/store/types";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/axios", async (importOriginal) => {
  // Keep every other export (createAxiosInstance, getApiUrl, named helpers)
  // intact so transitively-imported modules don't blow up; override only
  // the default axios instance whose `post` we're asserting on.
  const actual = await importOriginal<typeof import("@/api/axios")>();
  return {
    ...actual,
    default: { post: postMock },
  };
});

function makeRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_p_1",
    platform: "facebook",
    accountId: "p",
    conversationKey: "fb_p_1",
    name: "Alice",
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  postMock.mockReset();
  postMock.mockResolvedValue({ data: {} });
});

describe("sendForPlatform – facebook", () => {
  it("text-only POSTs JSON to /facebook/send-message/", async () => {
    await sendForPlatform(makeRow({ id: "fb_pageA_recip1" }), "hello", []);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith("/api/social/facebook/send-message/", {
      recipient_id: "recip1",
      page_id: "pageA",
      message: "hello",
      reply_to_message_id: "",
    });
  });

  it("threads reply_to_message_id when provided", async () => {
    await sendForPlatform(
      makeRow({ id: "fb_pageA_recip1" }),
      "thanks",
      [],
      "mid_original"
    );
    expect(postMock).toHaveBeenCalledWith("/api/social/facebook/send-message/", {
      recipient_id: "recip1",
      page_id: "pageA",
      message: "thanks",
      reply_to_message_id: "mid_original",
    });
  });

  it("with one attachment POSTs multipart with caption + reply", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await sendForPlatform(
      makeRow({ id: "fb_pageA_recip1" }),
      "caption",
      [file],
      "mid_q"
    );
    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, body] = postMock.mock.calls[0];
    expect(url).toBe("/api/social/facebook/send-message/");
    expect(body).toBeInstanceOf(FormData);
    const fd = body as FormData;
    expect(fd.get("recipient_id")).toBe("recip1");
    expect(fd.get("page_id")).toBe("pageA");
    expect(fd.get("message")).toBe("caption");
    expect(fd.get("reply_to_message_id")).toBe("mid_q");
    expect(fd.get("media")).toBeInstanceOf(File);
  });

  it("multi-file fan-out: first carries text + reply, rest send standalone", async () => {
    const f1 = new File(["a"], "a.png", { type: "image/png" });
    const f2 = new File(["b"], "b.png", { type: "image/png" });
    const f3 = new File(["c"], "c.pdf", { type: "application/pdf" });
    await sendForPlatform(
      makeRow({ id: "fb_pageA_recip1" }),
      "look at these",
      [f1, f2, f3],
      "mid_q"
    );
    expect(postMock).toHaveBeenCalledTimes(3);
    // First call carries the caption + reply.
    const fd1 = postMock.mock.calls[0][1] as FormData;
    expect(fd1.get("message")).toBe("look at these");
    expect(fd1.get("reply_to_message_id")).toBe("mid_q");
    // Second + third calls have no text + no reply.
    const fd2 = postMock.mock.calls[1][1] as FormData;
    expect(fd2.get("message")).toBe("");
    expect(fd2.get("reply_to_message_id")).toBeNull();
    const fd3 = postMock.mock.calls[2][1] as FormData;
    expect(fd3.get("message")).toBe("");
  });
});

describe("sendForPlatform – instagram", () => {
  it("text-only POSTs JSON to /instagram/send-message/", async () => {
    await sendForPlatform(
      makeRow({ id: "ig_acctA_recip1", platform: "instagram", accountId: "acctA" }),
      "hi",
      []
    );
    expect(postMock).toHaveBeenCalledWith("/api/social/instagram/send-message/", {
      recipient_id: "recip1",
      instagram_account_id: "acctA",
      message: "hi",
    });
  });
});

describe("sendForPlatform – whatsapp", () => {
  it("text-only POSTs JSON with a +-prefixed phone", async () => {
    await sendForPlatform(
      makeRow({ id: "wa_waba1_995551234567", platform: "whatsapp", accountId: "waba1" }),
      "hey",
      []
    );
    expect(postMock).toHaveBeenCalledWith("/api/social/whatsapp/send-message/", {
      to_number: "+995551234567",
      waba_id: "waba1",
      message: "hey",
      reply_to_message_id: "",
    });
  });

  it("with attachment uses multipart", async () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await sendForPlatform(
      makeRow({ id: "wa_waba1_995551234567", platform: "whatsapp", accountId: "waba1" }),
      "see image",
      [file]
    );
    const [url, body] = postMock.mock.calls[0];
    expect(url).toBe("/api/social/whatsapp/send-message/");
    expect(body).toBeInstanceOf(FormData);
  });
});

describe("sendForPlatform – widget", () => {
  it("text-only POSTs to /widget/admin/messages/send/ with numeric connection id", async () => {
    await sendForPlatform(
      makeRow({ id: "widget_5_sess-1", platform: "widget", accountId: "5" }),
      "agent reply",
      []
    );
    expect(postMock).toHaveBeenCalledWith("/api/widget/admin/messages/send/", {
      connection_id: 5,
      session_id: "sess-1",
      message_text: "agent reply",
    });
  });

  it("rejects file sends with a clear error", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(
      sendForPlatform(
        makeRow({ id: "widget_5_sess-1", platform: "widget", accountId: "5" }),
        "see image",
        [file]
      )
    ).rejects.toThrow(/not yet supported/);
  });
});

describe("sendForPlatform – unsupported prefix", () => {
  it("throws on unknown prefix", async () => {
    await expect(
      sendForPlatform(
        // @ts-expect-error: forcing an unsupported prefix
        { id: "tiktok_1_2", platform: "tiktok", accountId: "1" },
        "hi",
        []
      )
    ).rejects.toThrow(/Unsupported platform/);
    expect(postMock).not.toHaveBeenCalled();
  });
});
