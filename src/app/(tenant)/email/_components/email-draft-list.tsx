"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";

import type { EmailDraft } from "@/hooks/api/useSocial";
import { useDeleteEmailDraft } from "@/hooks/api/useSocial";
import { draftComposeHref, normalizeAddressList } from "@/lib/email-compose";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface EmailDraftListProps {
  drafts: EmailDraft[];
}

/**
 * The Drafts folder. EmailDraft rows are not EmailMessages, so they get their
 * own rows: opening one loads it into the composer and deleting one deletes
 * the draft (never an EmailMessage that happens to share its id).
 */
export function EmailDraftList({ drafts }: EmailDraftListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-16.5rem)]">
      <ul className="divide-y divide-border" data-testid="email-draft-list">
        {drafts.map((draft) => (
          <EmailDraftRow key={draft.id} draft={draft} />
        ))}
      </ul>
    </ScrollArea>
  );
}

function EmailDraftRow({ draft }: { draft: EmailDraft }) {
  const router = useRouter();
  const t = useTranslations("email.list");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const deleteDraft = useDeleteEmailDraft();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recipients = normalizeAddressList(draft.to_emails);
  const href = draftComposeHref(draft);

  function open() {
    router.push(href);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") open();
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    deleteDraft.mutate(draft.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast({ title: t("draftDeleted") });
      },
      onError: () => {
        toast({ title: t("deleteFailed"), variant: "destructive" });
      },
    });
  }

  return (
    <li
      className="group flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-muted/60"
      onClick={open}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-href={href}
    >
      <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-destructive">
            {t("draftLabel")}
          </span>
          <span className="line-clamp-1 break-all font-medium">
            {recipients.length > 0 ? recipients.join(", ") : t("noRecipients")}
          </span>
        </div>
        <span className="line-clamp-1 break-all text-sm text-muted-foreground">
          {draft.subject || t("noSubject")}
        </span>
      </div>
      <span className="shrink-0 text-sm text-muted-foreground">
        {formatDate(draft.updated_at)}
      </span>
      <span
        className="inline-flex"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          onClick={() => setConfirmOpen(true)}
          aria-label={t("deleteDraft")}
          title={t("deleteDraft")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDraftTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDraftDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteDraft.isPending}>
                {tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteDraft.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDraft.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </span>
    </li>
  );
}
