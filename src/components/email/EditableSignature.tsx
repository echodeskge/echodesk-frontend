"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { sanitizeEmailHtml } from "@/lib/email-compose";

interface EditableSignatureProps {
  /** Signature HTML to load into the block. */
  html: string;
  /**
   * Bump to reload `html` into the block (e.g. the From account changed).
   * Typing never reloads, so the caret is not reset while editing.
   */
  resetKey: number | string;
  onChange: (html: string) => void;
  onRemove: () => void;
  label: string;
  removeLabel: string;
}

/**
 * The signature, inserted Outlook-style into the editable body under the
 * user's text. Keeps the signature's own HTML (images, links, tables), which
 * a textarea cannot.
 */
export function EditableSignature({
  html,
  resetKey,
  onChange,
  onRemove,
  label,
  removeLabel,
}: EditableSignatureProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeEmailHtml(html);
    // Only reload on an explicit reset, never on our own onChange echo.
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="group relative px-3 pb-2">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-testid="compose-signature"
        className="min-h-[1.5rem] rounded-sm border border-transparent p-1 text-sm outline-none hover:border-dashed hover:border-border focus:border-dashed focus:border-border [&_a]:text-blue-600 [&_a]:underline [&_img]:inline-block"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="absolute right-4 top-1 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
