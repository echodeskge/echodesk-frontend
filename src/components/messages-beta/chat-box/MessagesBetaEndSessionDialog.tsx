"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEndSession, useEndWidgetSession } from "@/hooks/api/useSocial";

import type { ConversationRow } from "../store/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRow;
  onEnded?: () => void;
}

/**
 * Confirm dialog for "End session". Two server paths:
 *
 *   • widget   → POST /widget/admin/sessions/end/ — sends the post-chat
 *                rating prompt to the visitor's iframe via session_ended WS.
 *   • fb/ig/wa → POST /social/assignments/end-session/ — marks the
 *                assignment completed; assignment_update WS frame propagates.
 *
 * Both endpoints already emit the broadcasts the beta store reacts to, so
 * we don't need to mutate local state — just toast and let the WS update
 * land.
 */
export function MessagesBetaEndSessionDialog({
  open,
  onOpenChange,
  conversation,
  onEnded,
}: Props) {
  const t = useTranslations("messagesBeta.endSessionDialog");
  const endSession = useEndSession();
  const endWidgetSession = useEndWidgetSession();
  const isWidget = conversation.platform === "widget";
  const isPending = endSession.isPending || endWidgetSession.isPending;

  const handleConfirm = async () => {
    try {
      if (isWidget) {
        const connectionId = Number(conversation.accountId);
        if (!Number.isFinite(connectionId)) {
          toast.error(t("invalidWidgetId"));
          return;
        }
        const res = await endWidgetSession.mutateAsync({
          connection_id: connectionId,
          session_id: conversation.conversationKey,
        });
        toast.success(
          res.status === "already_ended" ? t("alreadyEnded") : t("conversationEnded")
        );
      } else {
        await endSession.mutateAsync({
          platform: conversation.platform,
          conversation_id: conversation.conversationKey,
          account_id: conversation.accountId,
        });
        toast.success(t("sessionEnded"));
      }
      onOpenChange(false);
      onEnded?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("failedToEnd"));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {isWidget ? t("widgetDescription") : t("socialDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("endSession")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
