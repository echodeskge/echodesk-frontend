"use client";

import { useRouter } from "next/navigation";

import { EllipsisVertical, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn, formatDate, getInitials } from "@/lib/utils";
import { useEmailAction } from "@/hooks/api/useSocial";
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

  function handleAction(action: "delete" | "mark_read" | "mark_unread") {
    emailAction.mutate({ message_ids: [email.id], action });
  }

  return (
    <TableRow
      className={cn("cursor-pointer", email.is_read && "bg-muted")}
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
              {getInitials(email.from_name || email.from_email)}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold line-clamp-1 break-all">
            {email.from_name || email.from_email}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground line-clamp-1 break-all">
          {email.subject || t("noSubject")}
        </span>
      </TableCell>
      <TableCell className="w-28">
        <span className="text-sm text-muted-foreground">
          {formatDate(email.timestamp)}
        </span>
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
            <DropdownMenuItem onClick={() => handleAction("delete")}>
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
