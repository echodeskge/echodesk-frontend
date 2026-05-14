"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Ticket } from "@/api/generated/interfaces";
import { ticketsPartialUpdate } from "@/api/generated/api";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface TicketDescriptionProps {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDescription({ ticket, onUpdate }: TicketDescriptionProps) {
  const t = useTranslations("tickets");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rawHtml = ticket.rich_description || ticket.description || "";

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const startEditing = () => {
    // Strip HTML for plain-text editing
    const tmp = document.createElement("div");
    tmp.innerHTML = rawHtml;
    setDraft(tmp.textContent || tmp.innerText || "");
    setIsEditing(true);
  };

  const save = async () => {
    setIsEditing(false);
    if (draft === (ticket.description || "")) return;

    try {
      const updated = await ticketsPartialUpdate(ticket.id.toString(), {
        description: draft,
        rich_description: draft,
      });
      onUpdate(updated);
      toast.success(t("ticketUpdatedSuccess"));
    } catch (err) {
      console.error("Error updating description:", err);
      toast.error(t("ticketUpdatedError"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className="min-h-[120px] resize-y"
          placeholder={t("ticketDetail.noDescription")}
        />
        <p className="text-xs text-muted-foreground">
          Cmd+Enter to save, or click outside
        </p>
      </div>
    );
  }

  return (
    <div
      className="group relative cursor-pointer rounded-md p-3 -m-3 transition-colors hover:bg-muted/50 overflow-hidden"
      onClick={startEditing}
    >
      {rawHtml ? (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(rawHtml),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {t("ticketDetail.noDescription")}
        </p>
      )}
      {/* Hover hint: centered overlay with a soft backdrop so it doesn't
          fight long content (the previous corner badge overflowed for
          long-word locales like Georgian). The backdrop dims the
          description just enough that the hint is readable while still
          letting the user see what they're about to edit. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] rounded-md" />
        <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border shadow-sm text-xs font-medium text-foreground">
          <Pencil className="h-3.5 w-3.5" />
          {t("ticketDetail.clickToEdit")}
        </span>
      </div>
    </div>
  );
}
