"use client";

import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailContext } from "../_hooks/use-email-context";
import { useEmailAction } from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import { isTrashFolder } from "@/lib/email-reading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";

interface EmailListContentHeaderProps {
  emails: EmailMessage[];
  /** Current folder route — in Trash, delete is permanent and Restore is offered. */
  filter?: string;
}

export function EmailListContentHeader({
  emails,
  filter,
}: EmailListContentHeaderProps) {
  const { selectedEmailIds, handleToggleSelectAllEmails, handleClearSelection } =
    useEmailContext();
  const emailAction = useEmailAction();
  const t = useTranslations("email.list");
  const tView = useTranslations("email.view");
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inTrash = isTrashFolder(filter);

  const pageEmailIds = emails.map((e) => e.id);
  const selectedOnPage = pageEmailIds.filter((id) =>
    selectedEmailIds.includes(id)
  );
  const hasSelection = selectedOnPage.length > 0;

  let isCheckboxChecked: CheckedState;
  if (selectedOnPage.length === pageEmailIds.length && pageEmailIds.length > 0) {
    isCheckboxChecked = true;
  } else if (selectedOnPage.length > 0) {
    isCheckboxChecked = "indeterminate";
  } else {
    isCheckboxChecked = false;
  }

  function handleBulkAction(
    action: "delete" | "mark_read" | "mark_unread" | "restore"
  ) {
    if (selectedOnPage.length === 0) return;
    emailAction.mutate(
      { message_ids: selectedOnPage, action },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          handleClearSelection();
        },
        onError: () => {
          setDeleteOpen(false);
          toast({
            title: action === "delete" ? t("deleteFailed") : tView("actionFailed"),
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="flex items-center justify-between p-1 ps-3 border-b border-border md:p-2 md:ps-4">
      <Checkbox
        checked={isCheckboxChecked}
        onCheckedChange={() => handleToggleSelectAllEmails(pageEmailIds)}
        aria-label={t("selectAll")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
            aria-label={t("emailActions")}
            disabled={!hasSelection}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleBulkAction("mark_read")}>
            {t("markAsRead")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleBulkAction("mark_unread")}>
            {t("markAsUnread")}
          </DropdownMenuItem>
          {inTrash && (
            <DropdownMenuItem onClick={() => handleBulkAction("restore")}>
              {t("restore")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
            {inTrash ? t("deletePermanently") : t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EmailDeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        permanent={inTrash}
        count={selectedOnPage.length}
        isPending={emailAction.isPending}
        onConfirm={() => handleBulkAction("delete")}
      />
    </div>
  );
}
