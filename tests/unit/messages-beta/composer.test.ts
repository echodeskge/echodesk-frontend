/**
 * Tests for the /messages-beta composer's per-platform dispatcher.
 *
 * Validates only the URL + payload shape for each platform — the UI piece
 * (textarea, attach button, Cmd+Enter) is exercised in higher-level
 * integration tests separately.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { sendForPlatform } from "@/components/messages-beta/composer/MessagesBetaComposer";
import type { ConversationRow } from "@/components/messages-beta/store/types";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/axios", () => ({
  default: { post: postMock },
  getApiUrl: () => "http://test",
}));

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
    await sendForPlatform(makeRow({ id: "fb_pageA_recip1" }), "hello", null);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith("/api/social/facebook/send-message/", {
      recipient_id: "recip1",
      page_id: "pageA",
      message: "hello",
    });
  });

  it("with attachment POSTs multipart to /facebook/send-message/", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await sendForPlatform(makeRow({ id: "fb_pageA_recip1" }), "caption", file);
    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, body] = postMock.mock.calls[0];
    expect(url).toBe("/api/social/facebook/send-message/");
    expect(body).toBeInstanceOf(FormData);
    const fd = body as FormData;
    expect(fd.get("recipient_id")).toBe("recip1");
    expect(fd.get("page_id")).toBe("pageA");
    expect(fd.get("message")).toBe("caption");
    expect(fd.get("media")).toBeInstanceOf(File);
  });
});

describe("sendForPlatform – instagram", () => {
  it("text-only POSTs JSON to /instagram/send-message/", async () => {
    await sendForPlatform(
      makeRow({ id: "ig_acctA_recip1", platform: "instagram", accountId: "acctA" }),
      "hi",
      null
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
      null
    );
    expect(postMock).toHaveBeenCalledWith("/api/social/whatsapp/send-message/", {
      to_number: "+995551234567",
      waba_id: "waba1",
      message: "hey",
    });
  });

  it("leaves an already-prefixed phone alone", async () => {
    await sendForPlatform(
      makeRow({ id: "wa_waba1_+995551234567", platform: "whatsapp", accountId: "waba1" }),
      "hey",
      null
    );
    expect(postMock).toHaveBeenCalledWith("/api/social/whatsapp/send-message/", {
      to_number: "+995551234567",
      waba_id: "waba1",
      message: "hey",
    });
  });

  it("with attachment uses multipart", async () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await sendForPlatform(
      makeRow({ id: "wa_waba1_995551234567", platform: "whatsapp", accountId: "waba1" }),
      "see image",
      file
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
      null
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
        file
      )
    ).rejects.toThrow(/not yet supported/);
    expect(postMock).not.toHaveBeenCalled();
  });
});

describe("sendForPlatform – unsupported prefix", () => {
  it("throws on unknown prefix without calling axios", async () => {
    await expect(
      sendForPlatform(
        // @ts-expect-error: forcing an unsupported prefix
        { id: "tiktok_1_2", platform: "tiktok", accountId: "1" },
        "hi",
        null
      )
    ).rejects.toThrow(/Unsupported platform/);
    expect(postMock).not.toHaveBeenCalled();
  });
});
