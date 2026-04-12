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
      className="group relative cursor-pointer rounded-md p-3 -m-3 transition-colors hover:bg-muted/50"
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
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Pencil className="h-3 w-3" />
          {t("ticketDetail.clickToEdit")}
        </span>
      </div>
    </div>
  );
}
