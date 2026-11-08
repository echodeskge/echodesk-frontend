"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { File, ImageOff } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import { prepareEmailHtml } from "@/lib/email-reading";

interface EmailViewContentBodyProps {
  email: EmailMessage;
}

const QUOTE_MARKERS = [
  "--- Original Message ---",
  "---------- Forwarded message ----------",
];

const QUOTE_PATTERNS = [
  /^(On .+ wrote:)$/m,
  /^--- Original Message ---$/m,
  /^---------- Forwarded message ----------$/m,
];

/** Split plain text into the main body and quoted portions */
function splitQuotedText(text: string): { body: string; quoted: string } {
  for (const pattern of QUOTE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      return {
        body: text.slice(0, match.index).trimEnd(),
        quoted: text.slice(match.index),
      };
    }
  }
  return { body: text, quoted: "" };
}

/** Wrap quoted sections in HTML emails with a styled container */
function wrapHtmlQuotedSections(html: string): string {
  // If already has gmail_quote styling, leave as-is
  if (html.includes("gmail_quote")) return html;

  // Look for quote markers in HTML content
  for (const marker of QUOTE_MARKERS) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      // Find the nearest tag boundary before the marker
      let wrapStart = idx;
      // Look back for a <br> or tag boundary
      const beforeMarker = html.slice(Math.max(0, idx - 20), idx);
      const brMatch = beforeMarker.lastIndexOf("<br");
      if (brMatch !== -1) {
        wrapStart = idx - (beforeMarker.length - brMatch);
      }

      const before = html.slice(0, wrapStart);
      const quoted = html.slice(wrapStart);
      return `${before}<div class="echodesk-quoted">${quoted}</div>`;
    }
  }

  // Check for "On ... wrote:" pattern
  const onWroteMatch = html.match(/On .+? wrote:<br/);
  if (onWroteMatch && onWroteMatch.index !== undefined) {
    let wrapStart = onWroteMatch.index;
    const beforeMatch = html.slice(Math.max(0, wrapStart - 20), wrapStart);
    const brMatch = beforeMatch.lastIndexOf("<br");
    if (brMatch !== -1) {
      wrapStart = onWroteMatch.index - (beforeMatch.length - brMatch);
    }

    const before = html.slice(0, wrapStart);
    const quoted = html.slice(wrapStart);
    return `${before}<div class="echodesk-quoted">${quoted}</div>`;
  }

  return html;
}

/** Quote styling applied inside the isolated email iframe. */
const IFRAME_QUOTE_CSS = `
  .gmail_quote.gmail_quote_container, blockquote.gmail_quote, .echodesk-quoted {
    margin-top: 12px !important; border-radius: 6px !important;
    border: 1px solid #e5e7eb !important; background: #f9fafb !important;
    padding: 12px !important; font-size: 0.8rem !important; color: #6b7280 !important;
  }
  .gmail_attr { margin-bottom: 8px !important; font-size: 0.75rem !important; color: #6b7280 !important; }
  blockquote { border-left: 2px solid #d1d5db; margin-left: 0; padding-left: 12px; color: #6b7280; }
`;

/**
 * Renders sanitised email HTML in a sandboxed iframe (no scripts; popups
 * allowed so links open in a new tab). `allow-same-origin` only lets the
 * parent measure the document for auto-height — scripts never run inside.
 */
export function EmailHtmlFrame({
  srcDoc,
  title,
}: {
  srcDoc: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const next = Math.max(
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight ?? 0
    );
    if (next > 0) setHeight(next + 4);
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);

  const handleLoad = useCallback(() => {
    measure();
    const doc = iframeRef.current?.contentDocument;
    observerRef.current?.disconnect();
    if (doc?.body && typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(() => measure());
      observerRef.current.observe(doc.body);
    }
    // Late-loading images change the height — re-measure as each finishes.
    doc?.querySelectorAll("img").forEach((img) =>
      img.addEventListener("load", measure, { once: true })
    );
  }, [measure]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={handleLoad}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      referrerPolicy="no-referrer"
      className="w-full border-0 rounded-md bg-white"
      style={{ height }}
      data-testid="email-html-frame"
    />
  );
}

export function EmailViewContentBody({ email }: EmailViewContentBodyProps) {
  const hasHtml = !!email.body_html && email.body_html.trim().length > 0;
  const [showQuoted, setShowQuoted] = useState(true);
  // Remote images are blocked per message until the user asks for them.
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);
  const t = useTranslations("email.view");

  const { body, quoted } = useMemo(
    () => (hasHtml ? { body: "", quoted: "" } : splitQuotedText(email.body_text || "")),
    [email.body_text, hasHtml]
  );

  const prepared = useMemo(
    () =>
      hasHtml
        ? prepareEmailHtml(wrapHtmlQuotedSections(email.body_html), {
            attachments: email.attachments,
            allowRemoteImages,
            extraCss: IFRAME_QUOTE_CSS,
          })
        : null,
    [hasHtml, email.body_html, email.attachments, allowRemoteImages]
  );

  // Inline images shown in the body (cid:) are not repeated as chips.
  const visibleAttachments = useMemo(() => {
    const inline = new Set(prepared?.inlineAttachmentUrls ?? []);
    return (email.attachments ?? []).filter((a) => !a.url || !inline.has(a.url));
  }, [email.attachments, prepared]);

  return (
    <>
      {hasHtml && prepared ? (
        <div className="space-y-2">
          {prepared.blockedCount > 0 && !allowRemoteImages && (
            <div
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
              role="status"
            >
              <ImageOff className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t("imagesBlocked")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => setAllowRemoteImages(true)}
              >
                {t("showImages")}
              </Button>
            </div>
          )}
          <EmailHtmlFrame
            srcDoc={prepared.srcDoc}
            title={email.subject || t("messageBody")}
          />
        </div>
      ) : (
        <div className="max-w-[680px] space-y-3">
          <div className="whitespace-pre-wrap break-words text-[13px] leading-5 [text-wrap:pretty]">{body}</div>
          {quoted && (
            <div className="space-y-1">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowQuoted(!showQuoted)}
              >
                {showQuoted ? t("hideQuoted") : t("showQuoted")}
              </button>
              {showQuoted && (
                <div className="rounded-md border border-border bg-muted p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {quoted}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {visibleAttachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("attachments", { count: visibleAttachments.length })}>
          {visibleAttachments.map((attachment, index) => (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-border pe-2.5 ps-2 text-xs transition-colors hover:bg-muted"
            >
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[200px] truncate">{attachment.filename}</span>
              {attachment.size > 0 && (
                <span className="text-[11px] text-muted-foreground">{formatFileSize(attachment.size)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
