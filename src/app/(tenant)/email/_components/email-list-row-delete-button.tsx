"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn } from "@/lib/utils";
import { useEmailAction } from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

interface EmailListRowDeleteButtonProps {
  email: EmailMessage;
  filter: string;
  className?: string;
}

/**
 * Hover-revealed trash icon for a single email row. Uses the same
 * `useEmailAction({ action: "delete" })` mutation as the reading-pane delete
 * button and the bulk/row dropdown delete, so behaviour and query
 * invalidation stay identical.
 */
export function EmailListRowDeleteButton({
  email,
  filter,
  className,
}: EmailListRowDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const emailAction = useEmailAction();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const t = useTranslations("email.list");
  const tCommon = useTranslations("common");

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    emailAction.mutate(
      { message_ids: [email.id], action: "delete" },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ title: t("emailDeleted") });
          // If the deleted email is the one currently open, leave its view.
          if (params?.id && Number(params.id) === email.id) {
            router.push(`/email/${encodeURIComponent(filter)}`);
          }
        },
        onError: () => {
          toast({ title: t("deleteFailed"), variant: "destructive" });
        },
      }
    );
  }

  return (
    // The dialog is portalled, but React events still bubble through the
    // component tree to the row — stop them so the row never navigates.
    <span
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 text-muted-foreground hover:text-destructive",
          "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          className
        )}
        onClick={() => setOpen(true)}
        aria-label={t("deleteEmail")}
        title={t("deleteEmail")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={emailAction.isPending}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={emailAction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {emailAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}
