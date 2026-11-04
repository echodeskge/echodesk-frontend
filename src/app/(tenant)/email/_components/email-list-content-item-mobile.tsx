"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Paperclip, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn, formatDate } from "@/lib/utils";
import { useEmailAction } from "@/hooks/api/useSocial";
import {
  getListCounterparty,
  hasAttachments,
  isTrashFolder,
} from "@/lib/email-reading";
import { useEmailContext } from "../_hooks/use-email-context";
import { EmailAnsweredBadge } from "./email-answered-badge";
import { EmailListRowDeleteButton } from "./email-list-row-delete-button";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailListContentItemMobileProps {
  email: EmailMessage;
  filter: string;
  isSelected: boolean;
}

export function EmailListContentItemMobile({
  email,
  filter,
  isSelected,
}: EmailListContentItemMobileProps) {
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

  return (
    <li
      className={cn(
        "group flex items-center justify-between gap-1.5 p-1 ps-3 cursor-pointer",
        !email.is_read && "border-s-4 border-s-primary"
      )}
      data-unread={!email.is_read || undefined}
      onClick={handleNavigate}
      onKeyDown={handleOnKeyDown}
      tabIndex={0}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => handleToggleSelectEmail(email.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={t("selectEmail")}
      />
      <div className="flex-1 px-2">
        <div className="flex items-center gap-2">
          <EmailAnsweredBadge email={email} />
          <span
            className={cn(
              "line-clamp-1 break-all",
              email.is_read ? "font-normal" : "font-bold"
            )}
          >
            {email.subject || t("noSubject")}
          </span>
          {hasAttachments(email) && (
            <Paperclip
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-label={t("hasAttachments")}
            />
          )}
        </div>
        <span className="text-muted-foreground line-clamp-1 break-all">
          {counterparty.kind === "to"
            ? `${t("toPrefix")} ${counterparty.label || t("noRecipients")}`
            : `${t("from")} ${counterparty.label}`}
        </span>
        <span className="text-sm text-muted-foreground">
          {formatDate(email.timestamp)}
        </span>
      </div>
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
      <EmailListRowDeleteButton email={email} filter={filter} />
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
              emailAction.mutate({
                message_ids: [email.id],
                action: email.is_read ? "mark_unread" : "mark_read",
              })
            }
          >
            {email.is_read ? t("markAsUnread") : t("markAsRead")}
          </DropdownMenuItem>
          {inTrash && (
            <DropdownMenuItem
              onClick={() =>
                emailAction.mutate({
                  message_ids: [email.id],
                  action: "restore",
                })
              }
            >
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
          onConfirm={() =>
            emailAction.mutate(
              { message_ids: [email.id], action: "delete" },
              { onSuccess: () => setDeleteOpen(false) }
            )
          }
        />
      </span>
    </li>
  );
}
