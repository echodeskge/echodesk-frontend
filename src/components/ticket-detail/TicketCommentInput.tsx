"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MentionTextarea } from "@/components/MentionTextarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { commentsCreate } from "@/api/generated/api";
import { toast } from "sonner";

interface TicketCommentInputProps {
  ticketId: number;
  onCommentAdded: () => void;
}

export function TicketCommentInput({
  ticketId,
  onCommentAdded,
}: TicketCommentInputProps) {
  const t = useTranslations("tickets");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      await commentsCreate({
        ticket: ticketId,
        comment: commentText,
      });
      setCommentText("");
      onCommentAdded();
      toast.success(t("commentAddedSuccess"));
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error(t("commentAddedError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-4 border-t">
      <MentionTextarea
        value={commentText}
        onChange={setCommentText}
        placeholder={t("ticketDetail.addComment")}
        className="min-h-[80px]"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!commentText.trim() || submitting}
        >
          <Send className="h-4 w-4 mr-2" />
          {t("ticketDetail.send")}
        </Button>
      </div>
    </form>
  );
}
