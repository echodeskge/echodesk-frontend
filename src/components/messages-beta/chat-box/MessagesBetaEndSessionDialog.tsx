"use client";

import { Loader2 } from "lucide-react";
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
  const endSession = useEndSession();
  const endWidgetSession = useEndWidgetSession();
  const isWidget = conversation.platform === "widget";
  const isPending = endSession.isPending || endWidgetSession.isPending;

  const handleConfirm = async () => {
    try {
      if (isWidget) {
        const connectionId = Number(conversation.accountId);
        if (!Number.isFinite(connectionId)) {
          toast.error("Invalid widget connection id");
          return;
        }
        const res = await endWidgetSession.mutateAsync({
          connection_id: connectionId,
          session_id: conversation.conversationKey,
        });
        toast.success(
          res.status === "already_ended"
            ? "Already ended"
            : "Conversation ended"
        );
      } else {
        await endSession.mutateAsync({
          platform: conversation.platform,
          conversation_id: conversation.conversationKey,
          account_id: conversation.accountId,
        });
        toast.success("Session ended");
      }
      onOpenChange(false);
      onEnded?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to end session");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End this session?</AlertDialogTitle>
          <AlertDialogDescription>
            {isWidget
              ? "The visitor will see a rating prompt and the chat will close. They can start a new one any time."
              : "The customer will be asked to rate the conversation. You'll need to re-assign if they reply."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            End session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
