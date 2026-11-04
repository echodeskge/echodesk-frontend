"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EllipsisVertical, Paperclip, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn, formatDate, getInitials } from "@/lib/utils";
import { useEmailAction } from "@/hooks/api/useSocial";
import {
  getListCounterparty,
  hasAttachments,
  isTrashFolder,
} from "@/lib/email-reading";
import { useEmailContext } from "../_hooks/use-email-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { EmailAnsweredBadge } from "./email-answered-badge";
import { EmailListRowDeleteButton } from "./email-list-row-delete-button";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";

interface EmailListRowDesktopProps {
  email: EmailMessage;
  filter: string;
  isSelected: boolean;
}

export function EmailListRowDesktop({
  email,
  filter,
  isSelected,
}: EmailListRowDesktopProps) {
  const { handleToggleSelectEmail } = useEmailContext();
  const emailAction = useEmailAction();
  const router = useRouter();
  const t = useTranslations("email.list");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const counterparty = getListCounterparty(email, filter);
  const inTrash = isTrashFolder(email.folder) || isTrashFolder(filter);

  function handleNavigate() {
    if (!email.is_read) {
      emailAction.mutate({ message_ids: [email.id], action: "mark_read" });
    }
    router.push(`/email/${encodeURIComponent(filter)}/${email.id}`);
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      handleNavigate();
    }
  }

  function handleToggleStar(e: React.MouseEvent) {
    e.stopPropagation();
    emailAction.mutate({
      message_ids: [email.id],
      action: email.is_starred ? "unstar" : "star",
    });
  }

  function handleAction(
    action: "delete" | "mark_read" | "mark_unread" | "restore"
  ) {
    emailAction.mutate(
      { message_ids: [email.id], action },
      action === "delete" ? { onSuccess: () => setDeleteOpen(false) } : undefined
    );
  }

  return (
    <TableRow
      className={cn(
        "group cursor-pointer",
        // Outlook: unread rows are bold with an accent bar; read rows plain.
        !email.is_read && "font-semibold border-s-4 border-s-primary"
      )}
      data-unread={!email.is_read || undefined}
      onClick={handleNavigate}
      onKeyDown={handleOnKeyDown}
      tabIndex={0}
    >
      <TableCell className="w-10 text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => handleToggleSelectEmail(email.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("selectEmail")}
        />
      </TableCell>
      <TableCell className="w-10 text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={handleToggleStar}
          aria-label={email.is_starred ? t("unstarEmail") : t("starEmail")}
        >
          <Star
            className={cn(
              "h-4 w-4",
              email.is_starred
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </Button>
      </TableCell>
      <TableCell className="w-44">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(counterparty.initialsSource)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "line-clamp-1 break-all",
              email.is_read ? "font-normal" : "font-bold"
            )}
          >
            {counterparty.kind === "to"
              ? `${t("toPrefix")} ${counterparty.label || t("noRecipients")}`
              : counterparty.label}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <EmailAnsweredBadge email={email} />
          <span
            className={cn(
              "line-clamp-1 break-all",
              email.is_read ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {email.subject || t("noSubject")}
          </span>
          {hasAttachments(email) && (
            <Paperclip
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-label={t("hasAttachments")}
            />
          )}
        </div>
      </TableCell>
      <TableCell className="w-36">
        <div className="flex items-center justify-end gap-1">
          <span className="text-sm text-muted-foreground">
            {formatDate(email.timestamp)}
          </span>
          <EmailListRowDeleteButton email={email} filter={filter} />
        </div>
      </TableCell>
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label={t("moreActions")}
            >
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                handleAction(email.is_read ? "mark_unread" : "mark_read")
              }
            >
              {email.is_read ? t("markAsUnread") : t("markAsRead")}
            </DropdownMenuItem>
            {inTrash && (
              <DropdownMenuItem onClick={() => handleAction("restore")}>
                {t("restore")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {inTrash ? t("deletePermanently") : t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <EmailDeleteConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            permanent={inTrash}
            isPending={emailAction.isPending}
            onConfirm={() => handleAction("delete")}
          />
        </span>
      </TableCell>
    </TableRow>
  );
}
