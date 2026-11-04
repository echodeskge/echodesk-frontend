"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import {
  defaultExpandedIds,
  hasAttachments,
  messageSnippet,
  toSidebarFolder,
} from "@/lib/email-reading";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { EmailViewContent } from "./email-view-content";

interface EmailThreadProps {
  /** Conversation, oldest → newest (see sortThreadMessages). */
  messages: EmailMessage[];
  openedId: number;
  filter: string;
}

/**
 * Outlook conversation view: every message of the thread (incl. our Sent
 * replies) oldest → newest; the latest (and the one opened) start expanded,
 * earlier ones are collapsed to a one-line summary and expand on click.
 */
export function EmailThread({ messages, openedId, filter }: EmailThreadProps) {
  const t = useTranslations("email.view");
  const folderLabel = useFolderLabel();
  const defaults = useMemo(
    () => defaultExpandedIds(messages, openedId),
    [messages, openedId]
  );
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const collapsible = messages.length > 1;

  const isExpanded = (id: number) =>
    !collapsible || (id in overrides ? overrides[id] : defaults.has(id));

  function toggle(id: number) {
    setOverrides((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  }

  const opened = messages.find((m) => m.id === openedId);

  return (
    <div className="space-y-2" data-testid="email-thread">
      {collapsible && (
        <p className="text-xs text-muted-foreground">
          {t("conversationCount", { count: messages.length })}
        </p>
      )}
      {messages.map((message) => {
        const expanded = isExpanded(message.id);
        const folder = toSidebarFolder(message.folder);
        const showFolder =
          !!folder && !!opened && message.folder !== opened.folder;
        const sender = message.from_name || message.from_email;

        if (!expanded) {
          return (
            <button
              key={message.id}
              type="button"
              onClick={() => toggle(message.id)}
              aria-expanded={false}
              data-testid={`thread-message-${message.id}`}
              className={cn(
                "w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-start hover:bg-muted transition-colors",
                !message.is_read && "border-s-4 border-s-primary"
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {getInitials(sender)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      !message.is_read ? "font-semibold" : "font-medium"
                    )}
                  >
                    {sender}
                  </span>
                  {showFolder && folder && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {folderLabel(folder)}
                    </Badge>
                  )}
                  {hasAttachments(message) && (
                    <Paperclip
                      className="h-3 w-3 shrink-0 text-muted-foreground"
                      aria-label={t("hasAttachments")}
                    />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {messageSnippet(message)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(message.timestamp)}
              </span>
            </button>
          );
        }

        return (
          <div
            key={message.id}
            data-testid={`thread-message-${message.id}`}
            aria-expanded={true}
            className={cn(collapsible && "rounded-md border border-border")}
          >
            {collapsible && (
              <div className="flex items-center justify-between px-3 pt-2">
                {showFolder && folder ? (
                  <Badge variant="outline" className="text-[10px]">
                    {folderLabel(folder)}
                  </Badge>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toggle(message.id)}
                >
                  {t("collapse")}
                </button>
              </div>
            )}
            <EmailViewContent email={message} filter={filter} />
          </div>
        );
      })}
    </div>
  );
}
