"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useConversationSummaries,
  useSummarizeConversation,
  type AIConversationSummary,
} from "@/hooks/api/useSocial";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

/**
 * Inline AI summary card under the chat header (design: "AI summary · …" with
 * a close button). Opening it generates a fresh summary; earlier summaries of
 * the same conversation stay one click away.
 */
export function MessagesBetaSummaryCard({ conversation }: { conversation: ConversationRow }) {
  const t = useTranslations("messagesBeta.summaryDialog");
  const tCard = useTranslations("messagesBeta.summaryCard");
  const setShowSummary = useMessagesBetaStore((s) => s.setShowSummary);
  const summarize = useSummarizeConversation();
  const [summary, setSummary] = useState<AIConversationSummary | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const generatingForRef = useRef<string | null>(null);

  const triple = {
    platform: conversation.platform,
    conversation_id: conversation.conversationKey,
    account_id: conversation.accountId,
  };
  const previous = useConversationSummaries(triple, { enabled: true });

  const generate = async () => {
    if (generatingForRef.current === conversation.id) return;
    generatingForRef.current = conversation.id;
    try {
      setSummary(await summarize.mutateAsync(triple));
    } catch {
      /* the error state below explains it */
    } finally {
      generatingForRef.current = null;
    }
  };

  useEffect(() => {
    setSummary(null);
    setShowEarlier(false);
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const earlier = (previous.data || []).filter((s) => s.id !== summary?.id);

  return (
    <div
      className="mx-4 mt-3 shrink-0 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs leading-[18px]"
      data-testid="messages-summary-card"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          {summarize.isPending ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("generating")}
            </span>
          ) : summarize.isError ? (
            <span className="text-destructive">{t("error")}</span>
          ) : summary ? (
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap">
              <span className="font-semibold">{tCard("title")} · </span>
              {summary.summary_text}
            </p>
          ) : (
            <span className="text-muted-foreground">{t("empty")}</span>
          )}
          {!summarize.isPending && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => void generate()}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {summarize.isError ? t("retry") : t("regenerate")}
              </button>
              {earlier.length > 0 && (
                <button type="button" onClick={() => setShowEarlier((v) => !v)} className="hover:text-foreground">
                  {tCard("earlier")} ({earlier.length})
                </button>
              )}
            </div>
          )}
          {showEarlier && earlier.length > 0 && (
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto border-t pt-2">
              {earlier.map((s) => (
                <div key={s.id} className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                    {s.requested_by_name ? ` · ${s.requested_by_name}` : ""}
                  </p>
                  <p className="line-clamp-4 whitespace-pre-wrap">{s.summary_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowSummary(false)}
          aria-label={tCard("close")}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
