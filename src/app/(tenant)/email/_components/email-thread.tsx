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
import { cn } from "@/lib/utils";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { EmailViewContentBody } from "./email-view-content-body";
import { EmailViewContentHeader } from "./email-view-content-header";

interface EmailThreadProps {
  /** Conversation, oldest → newest (see sortThreadMessages). */
  messages: EmailMessage[];
  openedId: number;
  filter: string;
}

/**
 * Design conversation: one card per message (incl. our Sent replies), oldest →
 * newest. The latest (and the one opened) start expanded; each card's header
 * toggles it.
 */
export function EmailThread({ messages, openedId }: EmailThreadProps) {
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
    if (!collapsible) return;
    setOverrides((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  }

  const opened = messages.find((m) => m.id === openedId);

  return (
    <div className="flex flex-col gap-3" data-testid="email-thread">
      {collapsible && (
        <p className="text-xs text-muted-foreground">
          {t("conversationCount", { count: messages.length })}
        </p>
      )}
      {messages.map((message) => {
        const expanded = isExpanded(message.id);
        const folder = toSidebarFolder(message.folder);
        const showFolder = !!folder && !!opened && message.folder !== opened.folder;

        return (
          <article
            key={message.id}
            data-testid={`thread-message-${message.id}`}
            aria-expanded={expanded}
            className={cn(
              "overflow-hidden rounded-lg border border-border bg-card",
              !message.is_read && !expanded && "border-s-[3px] border-s-primary"
            )}
          >
            <button
              type="button"
              onClick={() => toggle(message.id)}
              disabled={!collapsible}
              aria-label={expanded ? t("collapse") : t("expand")}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start",
                collapsible && "hover:bg-muted/40"
              )}
            >
              <EmailViewContentHeader email={message} />
            </button>
            {(showFolder || (!expanded && hasAttachments(message))) && (
              <div className="-mt-1 flex items-center gap-1.5 pb-2 pe-3.5 ps-14">
                {showFolder && folder && (
                  <span className="rounded border border-border px-1.5 text-[10px] text-muted-foreground">
                    {folderLabel(folder)}
                  </span>
                )}
                {!expanded && hasAttachments(message) && (
                  <Paperclip className="h-3 w-3 text-muted-foreground" aria-label={t("hasAttachments")} />
                )}
              </div>
            )}
            {expanded ? (
              <div className="pb-3.5 pe-3.5 ps-3.5 pt-1 sm:ps-14">
                <EmailViewContentBody email={message} />
              </div>
            ) : (
              <p className="truncate pb-2.5 pe-3.5 ps-14 text-xs text-muted-foreground">
                {messageSnippet(message)}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
