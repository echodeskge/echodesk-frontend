"use client";

import { useTranslations } from "next-intl";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";

/**
 * Inline notice shown when the open chat is archived (History) while the
 * sidebar is still on the active (All/Assigned) view — e.g. another agent
 * ended the session while this one had the chat open. The chat stays open;
 * this strip just explains why it vanished from the list. Self-clears when
 * the chat is restored or the user switches to the History view.
 */
export function MessagesBetaArchivedNotice({ chatId }: { chatId: string }) {
  const t = useTranslations("messagesBeta.chatBox");
  const isArchived = useMessagesBetaStore((s) => !!s.archivedByChatId[chatId]);
  const showArchived = useMessagesBetaStore((s) => s.showArchived);

  if (!isArchived || showArchived) return null;

  return (
    <div
      role="status"
      className="shrink-0 border-b border-border bg-muted/50 px-6 py-2 text-center"
    >
      <p className="text-sm text-muted-foreground">{t("movedToHistory")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("movedToHistoryHint")}</p>
    </div>
  );
}
