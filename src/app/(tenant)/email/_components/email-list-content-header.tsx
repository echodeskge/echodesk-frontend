"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, Mail, MailOpen, Minus, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailContext } from "../_hooks/use-email-context";
import { useEmailAction, useMoveEmail } from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import { classifyFolderRole, isTrashFolder } from "@/lib/email-reading";
import { cn } from "@/lib/utils";
import { useSidebarFolders } from "../_hooks/use-sidebar-folders";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";
import { EmailListSearchForm } from "./email-list-search-form";

interface EmailListContentHeaderProps {
  emails: EmailMessage[];
  /** Current folder route — in Trash, delete is permanent and Restore is offered. */
  filter?: string;
  /** Drafts list: search / unread / bulk actions don't apply. */
  simple?: boolean;
}

const iconButton =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

/**
 * Design list toolbar (44px): select-all checkbox, then either the search box
 * and the Unread toggle, or "N selected" with Mark as read / Archive / Delete.
 */
export function EmailListContentHeader({
  emails,
  filter,
  simple = false,
}: EmailListContentHeaderProps) {
  const {
    selectedEmailIds,
    handleToggleSelectAllEmails,
    handleToggleSelectEmail,
    handleClearSelection,
    currentConnectionId,
  } = useEmailContext();
  const emailAction = useEmailAction();
  const moveEmail = useMoveEmail();
  const t = useTranslations("email.list");
  const tView = useTranslations("email.view");
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inTrash = isTrashFolder(filter);
  const unreadOnly = searchParams.get("unread") === "1";
  const foldersConnectionId = currentConnectionId ?? emails[0]?.connection_id;
  const { folders } = useSidebarFolders(foldersConnectionId);
  const archiveFolder = folders.find((f) => f.role === "archive");

  const pageEmailIds = emails.map((e) => e.id);
  const selectedOnPage = pageEmailIds.filter((id) => selectedEmailIds.includes(id));
  const hasSelection = selectedOnPage.length > 0;
  const allSelected = hasSelection && selectedOnPage.length === pageEmailIds.length;
  const selectedEmails = emails.filter((e) => selectedOnPage.includes(e.id));
  const canArchive =
    !!archiveFolder &&
    selectedEmails.length > 0 &&
    selectedEmails.every((e) => !!e.message_id && classifyFolderRole(e.folder) !== "archive");

  function toggleUnread() {
    const params = new URLSearchParams(searchParams.toString());
    if (unreadOnly) params.delete("unread");
    else params.set("unread", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleBulkAction(action: "delete" | "mark_read" | "mark_unread" | "restore") {
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

  /**
   * Archive each selected message into ITS mailbox's archive folder: with
   * "All accounts" the loaded folder list belongs to one mailbox only, so
   * other mailboxes get the canonical "Archive" name, which the backend
   * resolves through that mailbox's own archive folder (special-use role).
   * Failures keep their rows selected and are reported.
   */
  async function handleBulkArchive() {
    if (!archiveFolder) return;
    let done = 0;
    let failed = 0;
    for (const email of selectedEmails) {
      try {
        await moveEmail.mutateAsync({
          message_id: email.message_id,
          source_folder: email.folder || "INBOX",
          target_folder:
            email.connection_id === foldersConnectionId ? archiveFolder.name : "Archive",
          connection_id: email.connection_id,
        });
        done += 1;
        handleToggleSelectEmail(email.id);
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast({ title: t("archivedCount", { count: done }) });
    } else {
      toast({
        title: t("archivePartial", { done, failed }),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border pe-2.5 ps-3">
      {!simple && (
        <button
          type="button"
          role="checkbox"
          aria-checked={allSelected ? true : hasSelection ? "mixed" : false}
          aria-label={t("selectAll")}
          disabled={pageEmailIds.length === 0}
          onClick={() => handleToggleSelectAllEmails(pageEmailIds)}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input transition-colors disabled:opacity-50",
            hasSelection && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {allSelected ? <Check className="h-3 w-3" /> : hasSelection ? <Minus className="h-3 w-3" /> : null}
        </button>
      )}
      {hasSelection ? (
        <>
          <span className="text-xs font-medium" aria-live="polite">
            {t("selectedCount", { count: selectedOnPage.length })}
          </span>
          <div className="ms-auto flex items-center gap-0.5">
            <button type="button" className={iconButton} title={t("markAsRead")} aria-label={t("markAsRead")} onClick={() => handleBulkAction("mark_read")}>
              <MailOpen className="h-[15px] w-[15px]" />
            </button>
            <button type="button" className={iconButton} title={t("markAsUnread")} aria-label={t("markAsUnread")} onClick={() => handleBulkAction("mark_unread")}>
              <Mail className="h-[15px] w-[15px]" />
            </button>
            {canArchive && (
              <button type="button" className={iconButton} title={tView("archive")} aria-label={tView("archive")} onClick={handleBulkArchive} disabled={moveEmail.isPending}>
                <Archive className="h-[15px] w-[15px]" />
              </button>
            )}
            {inTrash && (
              <button type="button" className={iconButton} title={t("restore")} aria-label={t("restore")} onClick={() => handleBulkAction("restore")}>
                <RotateCcw className="h-[15px] w-[15px]" />
              </button>
            )}
            <button
              type="button"
              className={cn(iconButton, "hover:bg-destructive/10 hover:text-destructive")}
              title={inTrash ? t("deletePermanently") : t("delete")}
              aria-label={inTrash ? t("deletePermanently") : t("delete")}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-[15px] w-[15px]" />
            </button>
          </div>
        </>
      ) : simple ? (
        <span className="text-xs font-medium text-muted-foreground">{t("draftsTitle")}</span>
      ) : (
        <>
          <EmailListSearchForm />
          <button
            type="button"
            onClick={toggleUnread}
            aria-pressed={unreadOnly}
            title={t("unreadOnly")}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs transition-colors",
              unreadOnly
                ? "border-border bg-muted text-foreground"
                : "border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Mail className="h-3 w-3" />
            {t("unread")}
          </button>
        </>
      )}
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
