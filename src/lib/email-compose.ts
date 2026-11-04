/**
 * Pure helpers for the Outlook-style email composer: signature resolution,
 * reply / reply-all recipients, HTML escaping, quoting the original message
 * and mapping EmailDraft rows to and from composer state.
 *
 * Kept free of React so both composers (the /email route and the chat
 * ComposeEmailDialog) and the unit tests share one implementation.
 */
import DOMPurify from "dompurify";

import type {
  EmailConnectionDetail,
  EmailDraft,
  EmailEffectiveSignature,
  EmailMessage,
} from "@/hooks/api/useSocial";

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

/** Marks the signature block inside a composed body so drafts can restore it. */
export const SIGNATURE_ATTR = "data-echodesk-signature";
/** Marks the quoted-original block inside a composed body. */
export const QUOTE_ATTR = "data-echodesk-quote";

// ---------------------------------------------------------------------------
// Escaping / conversion
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text so it is shown literally when interpolated into HTML. */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Plain text → safe HTML, keeping line breaks. */
export function textToHtml(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

/** Rough HTML → plain text for the text/plain alternative. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const text = html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sanitise third-party / user HTML for embedding in our body or the UI. */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    // <style> from the original would restyle our whole message (and the
    // app when previewed); forms/iframes have no place in a quote.
    FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button"],
  });
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

type AddressLike = string | { email?: string | null; name?: string | null } | null | undefined;

/** "Name <a@b.c>" | "a@b.c" | {email} → "a@b.c" (lower-cased), or "" */
export function extractEmail(value: AddressLike): string {
  if (!value) return "";
  const raw = typeof value === "string" ? value : value.email || "";
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/** Normalise a JSON address list (strings or {email,name}) to bare emails. */
export function normalizeAddressList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    const email = extractEmail(item as AddressLike);
    if (email && !out.includes(email)) out.push(email);
  }
  return out;
}

/** Split a Reply-To header value that may hold several addresses. */
function splitAddressHeader(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => extractEmail(part))
    .filter(Boolean);
}

export interface ReplyRecipients {
  to: string[];
  cc: string[];
}

/**
 * Outlook rules:
 * - Reply goes to Reply-To, else From.
 * - Replying to something we sent (Sent folder / is_from_business) goes to
 *   the original recipients, not back to ourselves.
 * - Reply all adds every original To + Cc, minus our own address(es).
 */
export function computeReplyRecipients(
  original: Pick<
    EmailMessage,
    "from_email" | "reply_to" | "to_emails" | "cc_emails" | "folder" | "is_from_business"
  > & { connection_email?: string },
  ownAddresses: string[],
  replyAll: boolean
): ReplyRecipients {
  const own = new Set(
    [...ownAddresses, original.connection_email || ""]
      .map((a) => extractEmail(a))
      .filter(Boolean)
  );
  const notOwn = (email: string) => !!email && !own.has(email);
  const dedupe = (list: string[]) => Array.from(new Set(list));

  const fromEmail = extractEmail(original.from_email);
  const originalTo = normalizeAddressList(original.to_emails);
  const originalCc = normalizeAddressList(original.cc_emails);

  const sentByUs =
    original.folder === "Sent" ||
    !!original.is_from_business ||
    (fromEmail !== "" && own.has(fromEmail));

  let to: string[];
  if (sentByUs) {
    to = originalTo.filter(notOwn);
    // A note to self: reply to ourselves rather than to nobody.
    if (to.length === 0 && fromEmail) to = [fromEmail];
  } else {
    const replyTo = splitAddressHeader(original.reply_to);
    to = replyTo.length > 0 ? replyTo : fromEmail ? [fromEmail] : [];
  }

  let cc: string[] = [];
  if (replyAll) {
    if (!sentByUs) {
      to = [...to, ...originalTo.filter(notOwn)];
    }
    to = dedupe(to);
    cc = dedupe(originalCc.filter(notOwn)).filter((e) => !to.includes(e));
  }

  return { to: dedupe(to), cc };
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export function prefixSubject(subject: string | null | undefined, kind: "reply" | "forward"): string {
  const s = (subject || "").trim();
  if (kind === "reply") {
    return /^re:/i.test(s) ? s : `Re: ${s}`;
  }
  return /^(fwd?|fw):/i.test(s) ? s : `Fwd: ${s}`;
}

// ---------------------------------------------------------------------------
// Signatures
// ---------------------------------------------------------------------------

export interface ComposeSignature {
  html: string;
  text: string;
}

/**
 * The signature to insert into the editable body for this connection, or
 * null when none applies. Returns undefined when the backend does not expose
 * `effective_signature` yet — the caller must then NOT insert a signature
 * nor send `signature_included` (the old backend appends it itself).
 */
export function resolveComposeSignature(
  connection: Pick<EmailConnectionDetail, "effective_signature"> | null | undefined,
  mode: ComposeMode
): ComposeSignature | null | undefined {
  if (!connection) return null;
  const eff: EmailEffectiveSignature | undefined = connection.effective_signature;
  if (!eff) return undefined;
  if (eff.source === "none" || !eff.is_enabled) return null;
  if (mode !== "new" && !eff.include_on_reply) return null;
  const html = eff.signature_html?.trim()
    ? eff.signature_html
    : textToHtml(eff.signature_text);
  const text = eff.signature_text?.trim() ? eff.signature_text : htmlToText(eff.signature_html);
  if (!html.trim() && !text.trim()) return null;
  return { html, text };
}

/** Does the connection end up sending any signature (for the settings badge)? */
export function hasEffectiveSignature(
  connection: Pick<
    EmailConnectionDetail,
    "effective_signature" | "signature_html" | "signature_text"
  >
): boolean {
  if (connection.effective_signature) {
    return connection.effective_signature.source !== "none";
  }
  return !!(connection.signature_html || connection.signature_text);
}

export interface SignatureDialogState {
  html: string;
  text: string;
  /** True when the prefilled content is the workspace default, not the mailbox's own. */
  inherited: boolean;
  source: EmailEffectiveSignature["source"] | "legacy";
}

/** What the per-mailbox signature dialog should open with. */
export function signatureDialogInitialState(
  connection: Pick<
    EmailConnectionDetail,
    "effective_signature" | "signature_html" | "signature_text"
  >
): SignatureDialogState {
  const eff = connection.effective_signature;
  if (!eff) {
    return {
      html: connection.signature_html || "",
      text: connection.signature_text || "",
      inherited: false,
      source: "legacy",
    };
  }
  if (eff.source === "tenant") {
    return {
      html: eff.signature_html || "",
      text: eff.signature_text || "",
      inherited: true,
      source: "tenant",
    };
  }
  if (eff.source === "connection") {
    return {
      html: eff.signature_html || connection.signature_html || "",
      text: eff.signature_text || connection.signature_text || "",
      inherited: false,
      source: "connection",
    };
  }
  return {
    html: connection.signature_html || "",
    text: connection.signature_text || "",
    inherited: false,
    source: "none",
  };
}

/** Payload for saving the dialog onto the connection. */
export function signatureSavePayload(html: string, text: string) {
  return {
    signature_enabled: !!(html.trim() || text.trim()),
    signature_html: html,
    signature_text: text,
  };
}

// ---------------------------------------------------------------------------
// Quoting the original
// ---------------------------------------------------------------------------

export interface QuoteLabels {
  from: string;
  sent: string;
  to: string;
  cc: string;
  subject: string;
  /** Shown above the header block when forwarding. */
  forwardedMessage?: string;
}

export const DEFAULT_QUOTE_LABELS: QuoteLabels = {
  from: "From",
  sent: "Sent",
  to: "To",
  cc: "Cc",
  subject: "Subject",
  forwardedMessage: "Forwarded message",
};

type QuotableMessage = Pick<
  EmailMessage,
  "from_email" | "from_name" | "to_emails" | "cc_emails" | "subject" | "timestamp" | "body_html" | "body_text"
>;

function formatAddress(item: AddressLike): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  const email = item.email || "";
  return item.name ? `${item.name} <${email}>` : email;
}

function formatAddressList(list: unknown): string {
  return Array.isArray(list) ? list.map((i) => formatAddress(i as AddressLike)).filter(Boolean).join("; ") : "";
}

function formatSentDate(timestamp: string, locale?: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp || "";
  try {
    return date.toLocaleString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString();
  }
}

function headerRows(original: QuotableMessage, labels: QuoteLabels, locale?: string) {
  const fromValue = original.from_name
    ? `${original.from_name} <${original.from_email}>`
    : original.from_email;
  const rows: Array<[string, string]> = [
    [labels.from, fromValue],
    [labels.sent, formatSentDate(original.timestamp, locale)],
    [labels.to, formatAddressList(original.to_emails)],
  ];
  const cc = formatAddressList(original.cc_emails);
  if (cc) rows.push([labels.cc, cc]);
  rows.push([labels.subject, original.subject || ""]);
  return rows;
}

/** Outlook-like quoted original (header block + sanitised body) as HTML. */
export function buildQuotedHtml(
  original: QuotableMessage,
  mode: ComposeMode,
  labels: QuoteLabels = DEFAULT_QUOTE_LABELS,
  locale?: string
): string {
  const header = headerRows(original, labels, locale)
    .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
    .join("<br/>");
  const body = original.body_html?.trim()
    ? sanitizeEmailHtml(original.body_html)
    : textToHtml(original.body_text);
  const forwardTitle =
    mode === "forward" && labels.forwardedMessage
      ? `<div>---------- ${escapeHtml(labels.forwardedMessage)} ----------</div>`
      : "";
  return (
    `<div ${QUOTE_ATTR}="1">` +
    `<hr style="border:none;border-top:1px solid #e1e1e1;margin:12px 0"/>` +
    forwardTitle +
    `<div style="font-size:13px;color:#444">${header}</div><br/>` +
    `<div>${body}</div>` +
    `</div>`
  );
}

/** Same quote as plain text, for the text/plain part. */
export function buildQuotedText(
  original: QuotableMessage,
  mode: ComposeMode,
  labels: QuoteLabels = DEFAULT_QUOTE_LABELS,
  locale?: string
): string {
  const header = headerRows(original, labels, locale)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const body = original.body_text?.trim() ? original.body_text : htmlToText(original.body_html);
  const forwardTitle =
    mode === "forward" && labels.forwardedMessage
      ? `---------- ${labels.forwardedMessage} ----------\n`
      : "";
  return `________________________________\n${forwardTitle}${header}\n\n${body}`;
}

// ---------------------------------------------------------------------------
// Composing the outgoing body
// ---------------------------------------------------------------------------

export interface ComposedBodyInput {
  /** What the user typed (plain text — escaped here). */
  text: string;
  /** Signature HTML (may have been edited in the composer); null = none. */
  signatureHtml: string | null;
  /** Pre-built quote HTML (buildQuotedHtml) or "". */
  quoteHtml?: string;
  /**
   * Drafts only: with no signature, write an empty marker block so reopening
   * the draft does not re-insert the mailbox signature the user removed.
   */
  markNoSignature?: boolean;
}

/** Value of the empty signature block that records "no signature". */
export const SIGNATURE_NONE = "none";

/** Outlook order: new text, then signature, then the quoted original. */
export function buildComposedHtml({
  text,
  signatureHtml,
  quoteHtml,
  markNoSignature,
}: ComposedBodyInput): string {
  let html = `<div>${textToHtml(text)}</div>`;
  if (signatureHtml && signatureHtml.trim()) {
    html += `<br/><div ${SIGNATURE_ATTR}="1">${sanitizeEmailHtml(signatureHtml)}</div>`;
  } else if (markNoSignature) {
    html += `<div ${SIGNATURE_ATTR}="${SIGNATURE_NONE}"></div>`;
  }
  if (quoteHtml) html += quoteHtml;
  return html;
}

export function buildComposedText(
  text: string,
  signatureHtml: string | null,
  quoteText?: string
): string {
  const parts = [text];
  const sigText = signatureHtml ? htmlToText(signatureHtml) : "";
  if (sigText) parts.push(sigText);
  if (quoteText) parts.push(quoteText);
  return parts.join("\n\n");
}

/** Pull the (possibly edited) signature back out of a composed body. */
export function extractSignatureHtml(bodyHtml: string | null | undefined): string | null {
  if (!bodyHtml || typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
  const el = doc.querySelector(`[${SIGNATURE_ATTR}]`);
  if (!el || el.getAttribute(SIGNATURE_ATTR) === SIGNATURE_NONE) return null;
  return el.innerHTML;
}

/** Was the body saved by this composer with the signature removed / absent? */
export function hasNoSignatureMarker(bodyHtml: string | null | undefined): boolean {
  if (!bodyHtml || typeof DOMParser === "undefined") return false;
  const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
  return !!doc.querySelector(`[${SIGNATURE_ATTR}="${SIGNATURE_NONE}"]`);
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export interface ComposeDraftState {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyText: string;
  connectionId: number | undefined;
  mode: ComposeMode;
  /** EmailMessage id being replied to / forwarded, if any. */
  originalId: number | null;
  /** Signature as saved in the draft; null = draft had no signature block. */
  signatureHtml: string | null;
  /**
   * The draft explicitly has no signature (the user removed it, or none
   * applied when it was written) — do not insert the mailbox signature.
   */
  signatureRemoved?: boolean;
}

/** Route that opens an EmailDraft in the composer (never /email/<folder>/<id>). */
export function draftComposeHref(draft: Pick<EmailDraft, "id">): string {
  return `/email/compose?draft=${draft.id}`;
}

/** EmailDraft row → composer state. */
export function draftToComposeState(
  draft: Pick<
    EmailDraft,
    | "to_emails"
    | "cc_emails"
    | "bcc_emails"
    | "subject"
    | "body_text"
    | "body_html"
    | "connection"
    | "reply_to_message"
    | "is_forward"
    | "is_reply_all"
  >
): ComposeDraftState {
  let mode: ComposeMode = "new";
  if (draft.is_forward) mode = "forward";
  else if (draft.reply_to_message) mode = draft.is_reply_all ? "replyAll" : "reply";
  return {
    to: normalizeAddressList(draft.to_emails),
    cc: normalizeAddressList(draft.cc_emails),
    bcc: normalizeAddressList(draft.bcc_emails),
    subject: draft.subject || "",
    bodyText: draft.body_text || "",
    connectionId: draft.connection ?? undefined,
    mode,
    originalId: draft.reply_to_message ?? null,
    signatureHtml: extractSignatureHtml(draft.body_html),
    signatureRemoved: hasNoSignatureMarker(draft.body_html),
  };
}

export interface DraftPayload {
  connection?: number;
  to_emails: Array<{ email: string }>;
  cc_emails: Array<{ email: string }>;
  bcc_emails: Array<{ email: string }>;
  subject: string;
  body_text: string;
  body_html: string;
  is_reply_all: boolean;
  is_forward: boolean;
  reply_to_message?: number;
}

/** Composer state → EmailDraft create/patch payload. */
export function composeStateToDraftPayload(state: ComposeDraftState): DraftPayload {
  const payload: DraftPayload = {
    to_emails: state.to.map((email) => ({ email })),
    cc_emails: state.cc.map((email) => ({ email })),
    bcc_emails: state.bcc.map((email) => ({ email })),
    subject: state.subject,
    body_text: state.bodyText,
    body_html: buildComposedHtml({
      text: state.bodyText,
      signatureHtml: state.signatureHtml,
      markNoSignature: true,
    }),
    is_reply_all: state.mode === "replyAll",
    is_forward: state.mode === "forward",
  };
  if (state.connectionId !== undefined) payload.connection = state.connectionId;
  if (state.originalId !== null) payload.reply_to_message = state.originalId;
  return payload;
}

/** Nothing worth saving yet? (no autosave of an untouched composer) */
export function isComposeStateEmpty(state: Pick<ComposeDraftState, "to" | "cc" | "bcc" | "subject" | "bodyText">): boolean {
  return (
    state.to.length === 0 &&
    state.cc.length === 0 &&
    state.bcc.length === 0 &&
    !state.subject.trim() &&
    !state.bodyText.trim()
  );
}

// ---------------------------------------------------------------------------
// Send result
// ---------------------------------------------------------------------------

/** Partial-success details of POST /email/send (C1): refused recipients and warnings. */
export interface SendResultProblems {
  refused: string[];
  warnings: string[];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)).filter((v) => v.trim()) : [];
}

/** Refused recipients / warnings of a successful send, or null when there are none. */
export function sendResultProblems(response: unknown): SendResultProblems | null {
  if (!response || typeof response !== "object") return null;
  const r = response as { refused_recipients?: unknown; warnings?: unknown };
  const refused = stringList(r.refused_recipients);
  const warnings = stringList(r.warnings);
  return refused.length || warnings.length ? { refused, warnings } : null;
}

/** Toast description for a failed send: the backend's error plus its details. */
export function sendErrorDescription(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (!data || typeof data !== "object") return fallback;
  const d = data as { error?: unknown; details?: unknown; refused_recipients?: unknown };
  const message = typeof d.error === "string" && d.error.trim() ? d.error : fallback;
  const parts = [message];
  if (typeof d.details === "string" && d.details.trim() && !message.includes(d.details)) {
    parts.push(d.details);
  }
  const refused = stringList(d.refused_recipients).filter((a) => !message.includes(a));
  if (refused.length) parts.push(refused.join(", "));
  return parts.join(" — ");
}
