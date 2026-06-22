"use client";

import { useMemo } from "react";
import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { useQuickReplies, type QuickReplyPlatform } from "@/hooks/api/useSocial";
import { matchQuickReplies, processQuickReplyMessage } from "@/lib/quickReply";

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

  const matches = useMemo(
    () => matchQuickReplies(quickReplies, query),
    [quickReplies, query]
  );

  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Zap className="h-3.5 w-3.5" />
        {t("savedReply")} · {t("clickToInsert")}
      </p>
      <div className="flex flex-col">
        {matches.map((reply) => (
          <button
            key={reply.id}
            type="button"
            onClick={() =>
              onSelect(
                processQuickReplyMessage(reply.message, { customerName, agentName, companyName })
              )
            }
            className="rounded-md px-2 py-1.5 text-left transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
          >
            <span className="text-sm font-medium">{reply.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{reply.message}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
