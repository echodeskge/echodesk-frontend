/**
 * Email follow-ups: images we host / our own mail load without a click,
 * trusted senders, the conversation reply target, one row per thread in the
 * views, and the Georgian date in the quoted reply header.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  addTrustedImageSender,
  blockingCsp,
  isTrustedImageSender,
  isTrustedUrl,
  mediaOrigins,
  prepareEmailHtml,
} from "@/lib/email-reading";
import { groupByThread, replyTarget } from "@/lib/email-ui";
import { formatSentDateKa } from "@/lib/email-compose";

const MEDIA = "https://echodesk-spaces.fra1.digitaloceanspaces.com";

describe("trusted image origins", () => {
  it("matches exact https origins only", () => {
    expect(isTrustedUrl(`${MEDIA}/media/sig/logo.png`, [MEDIA])).toBe(true);
    expect(isTrustedUrl("http://echodesk-spaces.fra1.digitaloceanspaces.com/x.png", [MEDIA])).toBe(false);
    expect(isTrustedUrl("https://evil.example/x.png", [MEDIA])).toBe(false);
    expect(isTrustedUrl(`${MEDIA}.evil.example/x.png`, [MEDIA])).toBe(false);
    expect(isTrustedUrl("not a url", [MEDIA])).toBe(false);
  });

  it("defaults to our Spaces bucket", () => {
    expect(mediaOrigins()).toContain(MEDIA);
  });

  it("keeps images on our storage while blocking trackers", () => {
    const html = `<p>Hi</p><img src="${MEDIA}/media/logo.png"><img src="https://tracker.example/p.gif">`;
    const out = prepareEmailHtml(html, { trustedOrigins: [MEDIA] });
    expect(out.blockedCount).toBe(1);
    expect(out.srcDoc).toContain(`src="${MEDIA}/media/logo.png"`);
    expect(out.srcDoc).not.toMatch(/\ssrc="https:\/\/tracker\.example/);
    expect(out.srcDoc).toContain(MEDIA); // allowed by the CSP too
  });

  it("puts trusted origins in the CSP img-src", () => {
    expect(blockingCsp([], [MEDIA])).toContain(`img-src 'self' data: blob: ${MEDIA}`);
  });
});

describe("always show images from a sender", () => {
  beforeEach(() => window.localStorage.clear());

  it("remembers senders case-insensitively", () => {
    expect(isTrustedImageSender("News@Shop.ge")).toBe(false);
    addTrustedImageSender("News@Shop.ge");
    expect(isTrustedImageSender("news@shop.ge")).toBe(true);
    expect(isTrustedImageSender("")).toBe(false);
  });
});

describe("replyTarget", () => {
  const opened = { id: 3, is_from_business: true, timestamp: "2026-11-03T10:00:00Z" };
  it("picks the customer's latest message, not our Sent copy", () => {
    const msgs = [
      { id: 1, is_from_business: false, timestamp: "2026-11-01T10:00:00Z" },
      { id: 2, is_from_business: false, timestamp: "2026-11-02T10:00:00Z" },
      opened,
    ];
    expect(replyTarget(msgs, opened).id).toBe(2);
  });
  it("falls back to the opened message", () => {
    expect(replyTarget([opened], opened).id).toBe(3);
  });
});

describe("groupByThread", () => {
  it("keeps the first (newest) row per connection + thread", () => {
    const rows = [
      { id: 9, connection_id: 1, thread_id: "a" },
      { id: 8, connection_id: 1, thread_id: "a" },
      { id: 7, connection_id: 2, thread_id: "a" },
      { id: 6, connection_id: 1, thread_id: null },
      { id: 5, connection_id: 1, thread_id: null },
    ];
    expect(groupByThread(rows).map((r) => r.id)).toEqual([9, 7, 6, 5]);
  });
});

describe("formatSentDateKa", () => {
  it("writes Georgian weekday and month names", () => {
    expect(formatSentDateKa(new Date(2026, 10, 9, 14, 5))).toBe("ორშაბათი, 9 ნოემბერი 2026, 14:05");
  });
});
