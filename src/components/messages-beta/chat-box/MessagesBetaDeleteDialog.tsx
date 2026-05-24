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
import { useDeleteConversation } from "@/hooks/api/useSocial";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRow;
}

/**
 * Confirm dialog for "Delete conversation" (admin only). The server-side
 * delete is permanent, so PR F adds a new `conversation_deleted` WS
 * broadcast so every other connected agent's sidebar drops the row live.
 *
 * Until PR F ships, this dialog still works for the actor (we proactively
 * remove the row from the local store on success); other agents will see
 * the chat disappear on their next sidebar refresh.
 */
export function MessagesBetaDeleteDialog({
  open,
  onOpenChange,
  conversation,
}: Props) {
  const t = useTranslations("messagesBeta.deleteDialog");
  const deleteConversation = useDeleteConversation();
  const removeConversation = useMessagesBetaStore((s) => s.removeConversation);

  const handleConfirm = async () => {
    try {
      await deleteConversation.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
      });
      // Local strip — PR F will broadcast `conversation_deleted` so every
      // other connected agent's store does the same. Until then, other
      // tabs catch up on their next REST refresh.
      removeConversation(conversation.id);
      toast.success(t("conversationDeleted"));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("failedToDelete"));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { platform: conversation.platform })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteConversation.isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteConversation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteConversation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
