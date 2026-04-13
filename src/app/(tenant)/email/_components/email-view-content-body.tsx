"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { CardContent } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import { Paperclip } from "lucide-react";

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

export function EmailViewContentBody({ email }: EmailViewContentBodyProps) {
  const hasHtml = email.body_html && email.body_html.trim().length > 0;
  const [showQuoted, setShowQuoted] = useState(true);

  const { body, quoted } = useMemo(
    () => (hasHtml ? { body: "", quoted: "" } : splitQuotedText(email.body_text)),
    [email.body_text, hasHtml]
  );

  return (
    <>
      {hasHtml ? (
        <>
          <style>{`
            .email-body .gmail_quote.gmail_quote_container,
            .email-body blockquote.gmail_quote,
            .email-body .echodesk-quoted {
              margin-top: 12px !important;
              border-radius: 6px !important;
              border: 1px solid hsl(var(--border)) !important;
              background: hsl(var(--muted)) !important;
              padding: 12px !important;
              font-size: 0.8rem !important;
              color: hsl(var(--muted-foreground)) !important;
            }
            .email-body .gmail_attr {
              margin-bottom: 8px !important;
              font-size: 0.75rem !important;
              color: hsl(var(--muted-foreground)) !important;
            }
            .email-body blockquote {
              border-left: 2px solid hsl(var(--muted-foreground) / 0.3) !important;
              padding-left: 12px !important;
              color: hsl(var(--muted-foreground)) !important;
              font-style: normal !important;
            }
          `}</style>
          <CardContent
            className="prose prose-sm max-w-none dark:prose-invert email-body"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(wrapHtmlQuotedSections(email.body_html), {
                ADD_TAGS: ["style"],
                ADD_ATTR: ["target"],
              }),
            }}
          />
        </>
      ) : (
        <CardContent className="space-y-3">
          <div className="whitespace-pre-wrap">{body}</div>
          {quoted && (
            <div className="space-y-1">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowQuoted(!showQuoted)}
              >
                {showQuoted ? "Hide quoted text" : "Show quoted text (...)"}
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
        </CardContent>
      )}

      {email.attachments && email.attachments.length > 0 && (
        <div className="px-6 py-3 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Attachments ({email.attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[200px]">
                  {attachment.filename}
                </span>
                {attachment.size > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({formatFileSize(attachment.size)})
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
