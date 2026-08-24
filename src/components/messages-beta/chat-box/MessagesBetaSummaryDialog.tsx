"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useConversationSummaries,
  useSummarizeConversation,
  type AIConversationSummary,
} from "@/hooks/api/useSocial";

import type { ConversationRow } from "../store/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRow;
}

/**
 * "Summarize chat" dialog. Opening it generates a fresh AI summary of the
 * whole conversation (synchronous backend call, up to ~90s for very long
 * transcripts) and lists previous summaries below, so an agent taking over
 * — or the owner preparing for a call — can catch up in one glance.
 */
export function MessagesBetaSummaryDialog({ open, onOpenChange, conversation }: Props) {
  const t = useTranslations("messagesBeta.summaryDialog");
  const summarize = useSummarizeConversation();
  const [summary, setSummary] = useState<AIConversationSummary | null>(null);
  // Guards the generate-on-open effect against StrictMode double-invokes
  // and re-renders while the mutation is in flight.
  const generatingForRef = useRef<string | null>(null);

  const triple = {
    platform: conversation.platform,
    conversation_id: conversation.conversationKey,
    account_id: conversation.accountId,
  };

  const previous = useConversationSummaries(triple, { enabled: open });

  const generate = async () => {
    if (generatingForRef.current === conversation.id) return;
    generatingForRef.current = conversation.id;
    try {
      const result = await summarize.mutateAsync(triple);
      setSummary(result);
    } catch (err: any) {
      const detail = err?.response?.data?.error;
      toast.error(detail || t("error"));
    } finally {
      generatingForRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setSummary(null);
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversation.id]);

  const olderSummaries = (previous.data || []).filter((s) => s.id !== summary?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{conversation.name}</DialogDescription>
        </DialogHeader>

        {summarize.isPending && (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("generating")}
          </div>
        )}

        {!summarize.isPending && summary && (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed max-h-72 overflow-y-auto">
              {summary.summary_text}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t("generatedAt", {
                  time: new Date(summary.created_at).toLocaleString(),
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void generate()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t("regenerate")}
              </Button>
            </div>
          </div>
        )}

        {!summarize.isPending && !summary && !summarize.isError && (
          <p className="text-sm text-muted-foreground py-4">{t("empty")}</p>
        )}

        {!summarize.isPending && summarize.isError && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-destructive">{t("error")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void generate()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("retry")}
            </Button>
          </div>
        )}

        {olderSummaries.length > 0 && (
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("previousSummaries")}
            </p>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {olderSummaries.map((s) => (
                <div key={s.id} className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                    {s.requested_by_name ? ` · ${s.requested_by_name}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap line-clamp-4">{s.summary_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
