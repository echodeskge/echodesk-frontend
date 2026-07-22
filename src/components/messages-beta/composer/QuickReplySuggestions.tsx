"use client";

import { useMemo, useState } from "react";
import { Eye, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useQuickReplies,
  type QuickReply,
  type QuickReplyPlatform,
} from "@/hooks/api/useSocial";
import { QuickReplyForm } from "@/components/social/QuickReplyForm";
import { matchQuickReplies, processQuickReplyMessage } from "@/lib/quickReply";

// Rough point where a message no longer fits the row's single truncated line.
const LONG_MESSAGE_THRESHOLD = 100;

interface QuickReplySuggestionsProps {
  /** Current composer text — matched against saved replies. */
  query: string;
  platform: QuickReplyPlatform;
  customerName?: string;
  agentName?: string;
  companyName?: string;
  /** Called with the fully-processed reply message when a suggestion is clicked. */
  onSelect: (message: string) => void;
}

/**
 * Inline "Saved reply · Click to insert" bar shown above the composer input.
 * Reuses the React Query cache populated by the ⚡ QuickReplySelector, so it
 * adds no extra request. The eye button on long replies opens the full
 * message in an edit popup.
 */
export function QuickReplySuggestions({
  query,
  platform,
  customerName,
  agentName,
  companyName,
  onSelect,
}: QuickReplySuggestionsProps) {
  const t = useTranslations("messagesBeta.composer");
  const { data: quickReplies } = useQuickReplies({ platform });
  const [previewReply, setPreviewReply] = useState<QuickReply | null>(null);

  const matches = useMemo(
    () => matchQuickReplies(quickReplies, query),
    [quickReplies, query]
  );

  if (matches.length === 0) return null;

  return (
    <>
      <div className="rounded-md border bg-muted/40 px-3 py-2">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          {t("savedReply")} · {t("clickToInsert")}
        </p>
        <div className="flex flex-col">
          {matches.map((reply) => {
            const isLongMessage =
              reply.message.length > LONG_MESSAGE_THRESHOLD || reply.message.includes("\n");

            return (
              <div key={reply.id} className="flex items-start gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onSelect(
                      processQuickReplyMessage(reply.message, {
                        customerName,
                        agentName,
                        companyName,
                      })
                    )
                  }
                  className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
                >
                  <span className="text-sm font-medium">{reply.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {reply.message}
                  </span>
                </button>
                {isLongMessage && (
                  <button
                    type="button"
                    aria-label={`${t("showFullMessage")}: ${reply.title}`}
                    title={t("showFullMessage")}
                    onClick={() => setPreviewReply(reply)}
                    className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:bg-primary/10 focus-visible:outline-none"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-message popup — same edit form as the ⚡ dialog's edit mode. */}
      <Dialog
        open={previewReply !== null}
        onOpenChange={(o) => {
          if (!o) setPreviewReply(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>{previewReply?.title}</DialogTitle>
            <DialogDescription>{t("savedReply")}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {previewReply && (
              <QuickReplyForm
                editingReply={previewReply}
                onSuccess={() => setPreviewReply(null)}
                onCancel={() => setPreviewReply(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
