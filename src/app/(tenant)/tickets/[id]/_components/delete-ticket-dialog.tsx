"use client";

/**
 * Delete confirmation for the detail ⋮ menu (plan FE-09). Only mounted when
 * `viewer_permissions.can_delete`; on success it goes back to the board.
 */
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DeleteTicketDialogProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
}

export function DeleteTicketDialog({ ticketId, open, onOpenChange, onConfirm, pending = false }: DeleteTicketDialogProps) {
  const t = useTranslations("ticketsScreen.detail.header");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-ticket-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteConfirmTitle", { id: ticketId })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={cn(buttonVariants({ variant: "destructive" }))}
            onClick={(e) => {
              // Keep the dialog open until the request settles.
              e.preventDefault();
              onConfirm();
            }}
          >
            {t("deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
