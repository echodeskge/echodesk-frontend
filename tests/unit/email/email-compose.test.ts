/**
 * Tests for the Outlook-style composer helpers in src/lib/email-compose.ts:
 * signature prefill/source logic, reply / reply-all recipients, HTML
 * escaping, quoting and EmailDraft <-> composer mapping.
 */
import { describe, it, expect } from "vitest";

import {
  buildComposedHtml,
  buildComposedText,
  buildQuotedHtml,
  buildQuotedText,
  composeStateToDraftPayload,
  computeReplyRecipients,
  draftComposeHref,
  draftToComposeState,
  escapeHtml,
  extractEmail,
  hasEffectiveSignature,
  htmlToText,
  isComposeStateEmpty,
  prefixSubject,
  resolveComposeSignature,
  sendErrorDescription,
  sendResultProblems,
  signatureDialogInitialState,
  signatureSavePayload,
  textToHtml,
} from "@/lib/email-compose";
import type { EmailEffectiveSignature } from "@/hooks/api/useSocial";

const eff = (over: Partial<EmailEffectiveSignature> = {}): EmailEffectiveSignature => ({
  source: "tenant",
  is_enabled: true,
  include_on_reply: true,
  signature_html: "<p>Regards,<br/>Team</p>",
  signature_text: "Regards,\nTeam",
  ...over,
});

describe("escaping", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;"
    );
    expect(escapeHtml(undefined)).toBe("");
  });

  it("textToHtml escapes and keeps line breaks", () => {
    expect(textToHtml("a<b\r\nc & d")).toBe("a&lt;b<br/>c &amp; d");
  });

  it("htmlToText turns markup into readable text", () => {
    expect(htmlToText("<p>Hi&nbsp;there</p><div>Line<br>two &amp; more</div><style>p{}</style>")).toBe(
      "Hi there\nLine\ntwo & more"
    );
  });

  it("buildComposedHtml escapes user text and orders text, signature, quote", () => {
    const html = buildComposedHtml({
      text: "1 < 2\nok",
      signatureHtml: "<b>Sig</b><script>x()</script>",
      quoteHtml: "<div data-echodesk-quote=\"1\">Q</div>",
    });
    expect(html).toContain("<div>1 &lt; 2<br/>ok</div>");
    expect(html).not.toContain("<script>");
    expect(html.indexOf("<b>Sig</b>")).toBeGreaterThan(html.indexOf("ok"));
    expect(html.indexOf("data-echodesk-quote")).toBeGreaterThan(html.indexOf("<b>Sig</b>"));
  });

  it("buildComposedText appends signature and quote as text", () => {
    expect(buildComposedText("Hello", "<p>Sig</p>", "> quote")).toBe("Hello\n\nSig\n\n> quote");
    expect(buildComposedText("Hello", null)).toBe("Hello");
  });
});

describe("addresses and subjects", () => {
  it("extracts bare lower-cased addresses", () => {
    expect(extractEmail("John <John@Example.com>")).toBe("john@example.com");
    expect(extractEmail({ email: "A@B.co", name: "A" })).toBe("a@b.co");
    expect(extractEmail(null)).toBe("");
  });

  it("prefixes Re:/Fwd: once", () => {
    expect(prefixSubject("Invoice", "reply")).toBe("Re: Invoice");
    expect(prefixSubject("RE: Invoice", "reply")).toBe("RE: Invoice");
    expect(prefixSubject("Invoice", "forward")).toBe("Fwd: Invoice");
    expect(prefixSubject("FW: Invoice", "forward")).toBe("FW: Invoice");
  });
});

describe("computeReplyRecipients", () => {
  const own = ["me@example.com", "sales@example.com"];
  const incoming = {
    from_email: "client@acme.com",
    reply_to: "",
    to_emails: [{ email: "me@example.com" }, { email: "boss@acme.com" }],
    cc_emails: [{ email: "Sales@example.com" }, { email: "cc@acme.com" }],
    folder: "INBOX",
    is_from_business: false,
  };

  it("reply goes to the sender", () => {
    expect(computeReplyRecipients(incoming, own, false)).toEqual({
      to: ["client@acme.com"],
      cc: [],
    });
  });

  it("reply prefers Reply-To (all of its addresses)", () => {
    const r = computeReplyRecipients(
      { ...incoming, reply_to: "Help <help@acme.com>, ops@acme.com" },
      own,
      false
    );
    expect(r.to).toEqual(["help@acme.com", "ops@acme.com"]);
  });

  it("reply all = sender + To in To, Cc in Cc, minus our own addresses", () => {
    expect(computeReplyRecipients(incoming, own, true)).toEqual({
      to: ["client@acme.com", "boss@acme.com"],
      cc: ["cc@acme.com"],
    });
  });

  it("replying to a message we sent addresses its original recipients", () => {
    const sent = {
      ...incoming,
      from_email: "me@example.com",
      to_emails: [{ email: "client@acme.com" }],
      cc_emails: [{ email: "cc@acme.com" }],
      folder: "Sent",
      is_from_business: true,
    };
    expect(computeReplyRecipients(sent, own, false)).toEqual({
      to: ["client@acme.com"],
      cc: [],
    });
    expect(computeReplyRecipients(sent, own, true)).toEqual({
      to: ["client@acme.com"],
      cc: ["cc@acme.com"],
    });
  });

  it("a note to self replies to self rather than to nobody", () => {
    const self = {
      ...incoming,
      from_email: "me@example.com",
      to_emails: [{ email: "me@example.com" }],
      cc_emails: [],
      folder: "Sent",
    };
    expect(computeReplyRecipients(self, own, false).to).toEqual(["me@example.com"]);
  });

  it("treats the message's own connection address as ours", () => {
    const r = computeReplyRecipients(
      { ...incoming, connection_email: "boss@acme.com" },
      [],
      true
    );
    expect(r.to).toEqual(["client@acme.com", "me@example.com"]);
  });
});

describe("resolveComposeSignature", () => {
  it("returns undefined for a legacy backend without effective_signature", () => {
    expect(resolveComposeSignature({}, "new")).toBeUndefined();
  });

  it("returns null without a connection", () => {
    expect(resolveComposeSignature(undefined, "new")).toBeNull();
  });

  it("uses the workspace (tenant) signature for new mail", () => {
    expect(resolveComposeSignature({ effective_signature: eff() }, "new")).toEqual({
      html: "<p>Regards,<br/>Team</p>",
      text: "Regards,\nTeam",
    });
  });

  it("respects include_on_reply for replies and forwards", () => {
    const conn = { effective_signature: eff({ include_on_reply: false }) };
    expect(resolveComposeSignature(conn, "new")).not.toBeNull();
    expect(resolveComposeSignature(conn, "reply")).toBeNull();
    expect(resolveComposeSignature(conn, "replyAll")).toBeNull();
    expect(resolveComposeSignature(conn, "forward")).toBeNull();
  });

  it("returns null for source none or disabled", () => {
    expect(resolveComposeSignature({ effective_signature: eff({ source: "none" }) }, "new")).toBeNull();
    expect(resolveComposeSignature({ effective_signature: eff({ is_enabled: false }) }, "new")).toBeNull();
  });

  it("builds escaped HTML from a text-only signature", () => {
    const sig = resolveComposeSignature(
      { effective_signature: eff({ source: "connection", signature_html: "", signature_text: "A & B\nCEO" }) },
      "new"
    );
    expect(sig).toEqual({ html: "A &amp; B<br/>CEO", text: "A & B\nCEO" });
  });
});

describe("signature settings dialog", () => {
  it("prefills the workspace signature when the mailbox inherits it", () => {
    const state = signatureDialogInitialState({
      signature_html: "",
      signature_text: "",
      effective_signature: eff(),
    });
    expect(state).toEqual({
      html: "<p>Regards,<br/>Team</p>",
      text: "Regards,\nTeam",
      inherited: true,
      source: "tenant",
    });
  });

  it("shows the mailbox's own signature", () => {
    const state = signatureDialogInitialState({
      signature_html: "<i>own</i>",
      signature_text: "own",
      effective_signature: eff({ source: "connection", signature_html: "<i>own</i>", signature_text: "own" }),
    });
    expect(state).toMatchObject({ html: "<i>own</i>", inherited: false, source: "connection" });
  });

  it("falls back to the connection fields on a legacy backend", () => {
    expect(
      signatureDialogInitialState({ signature_html: "<b>x</b>", signature_text: "" })
    ).toMatchObject({ html: "<b>x</b>", source: "legacy", inherited: false });
  });

  it("indicator reflects the effective source", () => {
    expect(hasEffectiveSignature({ effective_signature: eff() })).toBe(true);
    expect(hasEffectiveSignature({ effective_signature: eff({ source: "none" }) })).toBe(false);
    expect(hasEffectiveSignature({ signature_html: "x" })).toBe(true);
    expect(hasEffectiveSignature({})).toBe(false);
  });

  it("saving enables the mailbox signature only when it has content", () => {
    expect(signatureSavePayload("<b>x</b>", "")).toEqual({
      signature_enabled: true,
      signature_html: "<b>x</b>",
      signature_text: "",
    });
    expect(signatureSavePayload("  ", "")).toMatchObject({ signature_enabled: false });
  });
});

describe("quoting the original", () => {
  const original = {
    from_email: "client@acme.com",
    from_name: "Client <Inc>",
    to_emails: [{ email: "me@example.com", name: "Me" }],
    cc_emails: [{ email: "cc@acme.com" }],
    subject: "Q&A",
    timestamp: "2026-11-01T10:00:00Z",
    body_html: '<p onclick="x()">Hello <b>there</b></p><style>body{color:red}</style><script>bad()</script>',
    body_text: "Hello there",
  };

  it("builds an Outlook header block and sanitises the original HTML", () => {
    const html = buildQuotedHtml(original, "reply");
    expect(html).toContain("<b>From:</b> Client &lt;Inc&gt; &lt;client@acme.com&gt;");
    expect(html).toContain("<b>To:</b> Me &lt;me@example.com&gt;");
    expect(html).toContain("<b>Cc:</b> cc@acme.com");
    expect(html).toContain("<b>Subject:</b> Q&amp;A");
    expect(html).toContain("<b>there</b>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("Forwarded message");
  });

  it("falls back to escaped text when there is no HTML body, and marks forwards", () => {
    const html = buildQuotedHtml({ ...original, body_html: "", body_text: "a <tag>" }, "forward");
    expect(html).toContain("a &lt;tag&gt;");
    expect(html).toContain("Forwarded message");
  });

  it("builds the text quote from text, else from HTML", () => {
    expect(buildQuotedText(original, "reply")).toContain("Subject: Q&A\n\nHello there");
    expect(buildQuotedText({ ...original, body_text: "" }, "reply")).toContain("Hello there");
  });
});

describe("drafts", () => {
  const base = {
    to_emails: [{ email: "A@x.com" }, "B <b@x.com>"],
    cc_emails: [],
    bcc_emails: [{ email: "c@x.com" }],
    subject: "S",
    body_text: "Body",
    body_html: '<div>Body</div><br/><div data-echodesk-signature="1"><b>Sig</b></div>',
    connection: 3,
    reply_to_message: null,
    is_forward: false,
    is_reply_all: false,
  };

  it("opens drafts in the composer by draft id, not as an EmailMessage", () => {
    expect(draftComposeHref({ id: 9 })).toBe("/email/compose?draft=9");
  });

  it("maps a new-message draft to composer state, restoring the signature", () => {
    expect(draftToComposeState(base)).toEqual({
      to: ["a@x.com", "b@x.com"],
      cc: [],
      bcc: ["c@x.com"],
      subject: "S",
      bodyText: "Body",
      connectionId: 3,
      mode: "new",
      originalId: null,
      signatureHtml: "<b>Sig</b>",
      signatureRemoved: false,
    });
  });

  it("derives reply / reply all / forward from the draft", () => {
    expect(draftToComposeState({ ...base, reply_to_message: 4 })).toMatchObject({ mode: "reply", originalId: 4 });
    expect(draftToComposeState({ ...base, reply_to_message: 4, is_reply_all: true }).mode).toBe("replyAll");
    expect(draftToComposeState({ ...base, reply_to_message: 4, is_forward: true })).toMatchObject({
      mode: "forward",
      originalId: 4,
    });
    expect(draftToComposeState({ ...base, body_html: "<div>no sig</div>" }).signatureHtml).toBeNull();
  });

  it("round-trips composer state through the draft payload", () => {
    const state = draftToComposeState({ ...base, reply_to_message: 4, is_reply_all: true });
    const payload = composeStateToDraftPayload(state);
    expect(payload).toMatchObject({
      connection: 3,
      to_emails: [{ email: "a@x.com" }, { email: "b@x.com" }],
      bcc_emails: [{ email: "c@x.com" }],
      subject: "S",
      body_text: "Body",
      is_reply_all: true,
      is_forward: false,
      reply_to_message: 4,
    });
    expect(draftToComposeState({ ...base, ...payload }).signatureHtml).toBe("<b>Sig</b>");
  });

  it("omits reply_to_message for a new draft and detects empty state", () => {
    const payload = composeStateToDraftPayload(draftToComposeState(base));
    expect(payload).not.toHaveProperty("reply_to_message");
    expect(isComposeStateEmpty({ to: [], cc: [], bcc: [], subject: " ", bodyText: "" })).toBe(true);
    expect(isComposeStateEmpty({ to: [], cc: [], bcc: [], subject: "x", bodyText: "" })).toBe(false);
  });
});

describe("draft signature marker", () => {
  const base = {
    to: [],
    cc: [],
    bcc: [],
    subject: "S",
    bodyText: "Body",
    connectionId: 1,
    mode: "new" as const,
    originalId: null,
  };

  it("records a removed signature so reopening does not re-insert it", () => {
    const payload = composeStateToDraftPayload({ ...base, signatureHtml: null });
    expect(payload.body_html).toContain('data-echodesk-signature="none"');
    const st = draftToComposeState({
      ...payload,
      to_emails: [],
      cc_emails: [],
      bcc_emails: [],
      connection: 1,
      reply_to_message: null,
    } as never);
    expect(st.signatureHtml).toBeNull();
    expect(st.signatureRemoved).toBe(true);
  });

  it("keeps a present signature and never marks the outgoing body", () => {
    const payload = composeStateToDraftPayload({ ...base, signatureHtml: "<b>Sig</b>" });
    const st = draftToComposeState({ ...payload, connection: 1, reply_to_message: null } as never);
    expect(st.signatureHtml).toContain("<b>Sig</b>");
    expect(st.signatureRemoved).toBe(false);
    expect(buildComposedHtml({ text: "x", signatureHtml: null })).not.toContain("data-echodesk-signature");
  });

  it("treats a draft without any block (mobile) as not removed", () => {
    const st = draftToComposeState({
      to_emails: [],
      cc_emails: [],
      bcc_emails: [],
      subject: "",
      body_text: "",
      body_html: "<div>Body</div>",
      connection: 1,
      reply_to_message: null,
      is_forward: false,
      is_reply_all: false,
    } as never);
    expect(st.signatureHtml).toBeNull();
    expect(st.signatureRemoved).toBe(false);
  });
});

describe("send result helpers", () => {
  it("reports refused recipients and warnings of a partial send", () => {
    expect(sendResultProblems({ status: "success" })).toBeNull();
    expect(sendResultProblems({ refused_recipients: [], warnings: [] })).toBeNull();
    expect(
      sendResultProblems({ refused_recipients: ["a@x.example"], warnings: ["Not saved"] })
    ).toEqual({ refused: ["a@x.example"], warnings: ["Not saved"] });
    expect(sendResultProblems(undefined)).toBeNull();
  });

  it("describes a failed send with error, details and refused recipients", () => {
    expect(sendErrorDescription({}, "fallback")).toBe("fallback");
    expect(
      sendErrorDescription(
        { response: { data: { error: "Rejected.", details: "552 too large" } } },
        "fallback"
      )
    ).toBe("Rejected. — 552 too large");
    expect(
      sendErrorDescription(
        { response: { data: { error: "Refused: a@x.example", refused_recipients: ["a@x.example", "b@x.example"] } } },
        "fallback"
      )
    ).toBe("Refused: a@x.example — b@x.example");
  });
});
