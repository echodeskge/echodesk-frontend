"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

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

interface EmailDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Message(s) already in Trash — delete is permanent on the server. */
  permanent: boolean;
  /** Number of messages being deleted (bulk); defaults to 1. */
  count?: number;
  isPending?: boolean;
  onConfirm: () => void;
}

/**
 * Shared Outlook-style delete confirmation: outside Trash the message moves
 * to Deleted Items (Trash) on the mail server; inside Trash it is deleted
 * permanently.
 */
export function EmailDeleteConfirmDialog({
  open,
  onOpenChange,
  permanent,
  count = 1,
  isPending = false,
  onConfirm,
}: EmailDeleteConfirmDialogProps) {
  const t = useTranslations("email.list");
  const tCommon = useTranslations("common");
  const many = count > 1;

  let title: string;
  if (permanent) {
    title = many
      ? t("permanentDeleteManyTitle", { count })
      : t("permanentDeleteDialogTitle");
  } else {
    title = many ? t("deleteManyTitle", { count }) : t("deleteDialogTitle");
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {permanent
              ? t("permanentDeleteDialogDescription")
              : t("deleteDialogDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {permanent ? t("deletePermanently") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
