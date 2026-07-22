"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { useQuickReplies, type QuickReplyPlatform } from "@/hooks/api/useSocial";
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
 * adds no extra request.
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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const matches = useMemo(
    () => matchQuickReplies(quickReplies, query),
    [quickReplies, query]
  );

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Zap className="h-3.5 w-3.5" />
        {t("savedReply")} · {t("clickToInsert")}
      </p>
      <div className="flex flex-col">
        {matches.map((reply) => {
          const isExpanded = expandedIds.has(reply.id);
          const isLongMessage =
            reply.message.length > LONG_MESSAGE_THRESHOLD || reply.message.includes("\n");

          return (
            <div key={reply.id} className="flex items-start gap-0.5">
              <button
                type="button"
                onClick={() =>
                  onSelect(
                    processQuickReplyMessage(reply.message, { customerName, agentName, companyName })
                  )
                }
                className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
              >
                <span className="text-sm font-medium">{reply.title}</span>
                <span
                  className={`block text-xs text-muted-foreground ${
                    isExpanded ? "whitespace-pre-wrap break-words" : "truncate"
                  }`}
                >
                  {reply.message}
                </span>
              </button>
              {isLongMessage && (
                <button
                  type="button"
                  aria-label={`${isExpanded ? t("hideFullMessage") : t("showFullMessage")}: ${reply.title}`}
                  title={isExpanded ? t("hideFullMessage") : t("showFullMessage")}
                  onClick={() => toggleExpanded(reply.id)}
                  className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:bg-primary/10 focus-visible:outline-none"
                >
                  {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
