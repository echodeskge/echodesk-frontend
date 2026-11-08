"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  FolderInput,
  Mail,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailAction, useMoveEmail } from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import {
  classifyFolderRole,
  isTrashFolder,
  type SidebarFolder,
} from "@/lib/email-reading";
import { neighbourId } from "@/lib/email-ui";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmailContext } from "../_hooks/use-email-context";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { useSidebarFolders } from "../_hooks/use-sidebar-folders";
import { EmailAssignMenu } from "./email-assign-menu";
import { EmailCreateTicketButton } from "./email-create-ticket-button";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";

interface EmailViewContentActionsProps {
  email: EmailMessage;
  /** List route the message was opened from (where we return after acting). */
  filter?: string;
}

const tool =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";
const iconTool =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

/** The archive / inbox move targets for the open message. */
export function archiveTargets(email: Pick<EmailMessage, "folder">, folders: SidebarFolder[]) {
  const role = classifyFolderRole(email.folder);
  const archiveFolder = folders.find((f) => f.role === "archive");
  const inboxFolder = folders.find((f) => f.role === "inbox");
  return {
    inArchive: role === "archive",
    archiveFolder: role === "archive" ? undefined : archiveFolder,
    inboxFolder: role === "archive" ? inboxFolder : undefined,
  };
}

/**
 * Design reading toolbar (44px): Archive / Move to inbox, Delete, Mark unread,
 * Assign, Create ticket, Move to…; right: Star, Newer, Older.
 */
export function EmailViewContentActions({
  email,
  filter,
}: EmailViewContentActionsProps) {
  const emailAction = useEmailAction();
  const moveEmail = useMoveEmail();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const t = useTranslations("email.view");
  const tList = useTranslations("email.list");
  const folderLabel = useFolderLabel();
  const { listOrder } = useEmailContext();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { folders } = useSidebarFolders(email.connection_id);
  const inTrash = isTrashFolder(email.folder);
  const currentRole = classifyFolderRole(email.folder);
  const { archiveFolder, inboxFolder } = archiveTargets(email, folders);
  const moveTargets = folders.filter(
    (f) =>
      f.role !== "drafts" &&
      f.name !== email.folder &&
      !(currentRole !== "custom" && f.role === currentRole)
  );
  const canMove = !!email.message_id;
  const listRoute = filter || email.folder || "INBOX";
  const qs = searchParams.toString();
  const newer = neighbourId(listOrder, email.id, -1);
  const older = neighbourId(listOrder, email.id, 1);

  function openId(id: number | null) {
    if (id != null) router.push(`/email/${encodeURIComponent(listRoute)}/${id}${qs ? `?${qs}` : ""}`);
  }

  function backToList() {
    router.push(`/email/${encodeURIComponent(listRoute)}${qs ? `?${qs}` : ""}`);
  }

  function handleDelete() {
    emailAction.mutate(
      { message_ids: [email.id], action: "delete" },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          toast({
            title: inTrash
              ? tList("emailPermanentlyDeleted")
              : tList("emailDeleted"),
          });
          backToList();
        },
        onError: () => {
          toast({ title: tList("deleteFailed"), variant: "destructive" });
        },
      }
    );
  }

  function handleRestore() {
    emailAction.mutate(
      { message_ids: [email.id], action: "restore" },
      {
        onSuccess: () => {
          toast({ title: t("restored") });
          backToList();
        },
        onError: () => toast({ title: t("actionFailed"), variant: "destructive" }),
      }
    );
  }

  function handleMove(target: SidebarFolder) {
    if (!canMove) return;
    moveEmail.mutate(
      {
        message_id: email.message_id,
        // DB folder names: the backend resolves canonical names (Trash,
        // Archive, …) to the server folder by special-use flag, and keeps
        // the stored UID when the source matches the row's folder.
        source_folder: email.folder || "INBOX",
        target_folder: target.name,
        connection_id: email.connection_id,
      },
      {
        onSuccess: () => {
          toast({ title: t("movedTo", { folder: folderLabel(target) }) });
          backToList();
        },
        onError: () => toast({ title: t("moveFailed"), variant: "destructive" }),
      }
    );
  }

  function handleToggleStar() {
    emailAction.mutate({
      message_ids: [email.id],
      action: email.is_starred ? "unstar" : "star",
    });
  }

  function handleMarkUnread() {
    emailAction.mutate(
      { message_ids: [email.id], action: "mark_unread" },
      { onSuccess: () => backToList() }
    );
  }

  return (
    <div
      className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap border-b border-border px-2.5"
      data-testid="email-view-toolbar"
    >
      {inTrash ? (
        <button type="button" className={tool} onClick={handleRestore} disabled={emailAction.isPending}>
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("restore")}</span>
        </button>
      ) : archiveFolder && canMove ? (
        <button type="button" className={tool} onClick={() => handleMove(archiveFolder)} disabled={moveEmail.isPending}>
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("archive")}</span>
        </button>
      ) : inboxFolder && canMove ? (
        <button type="button" className={tool} onClick={() => handleMove(inboxFolder)} disabled={moveEmail.isPending}>
          <ArchiveRestore className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("moveToInbox")}</span>
        </button>
      ) : null}
      <button
        type="button"
        className={cn(tool, "hover:bg-destructive/10 hover:text-destructive")}
        aria-label={inTrash ? t("deletePermanently") : t("deleteEmail")}
        title={inTrash ? t("deletePermanently") : t("deleteEmail")}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{inTrash ? t("deleteForever") : t("delete")}</span>
      </button>
      <button type="button" className={tool} onClick={handleMarkUnread} title={t("markAsUnread")} aria-label={t("markAsUnread")}>
        <Mail className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("unread")}</span>
      </button>
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
      <EmailAssignMenu email={email} />
      <EmailCreateTicketButton email={email} />
      {canMove && moveTargets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={tool} disabled={moveEmail.isPending} aria-label={t("moveTo")}>
              <FolderInput className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t("moveTo")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
            {moveTargets.map((folder) => (
              <DropdownMenuItem
                key={`${folder.role}:${folder.name}`}
                onClick={() => handleMove(folder)}
                className="text-[13px]"
              >
                {folderLabel(folder)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className="ms-auto flex items-center gap-0.5 ps-2">
        <button
          type="button"
          className={cn(iconTool, email.is_starred && "text-[#eab308] hover:text-[#eab308]")}
          aria-label={email.is_starred ? t("unstarEmail") : t("starEmail")}
          title={email.is_starred ? t("unstarEmail") : t("starEmail")}
          onClick={handleToggleStar}
        >
          <Star className={cn("h-4 w-4", email.is_starred && "fill-current")} />
        </button>
        <button type="button" className={iconTool} aria-label={t("newer")} title={t("newer")} disabled={newer == null} onClick={() => openId(newer)}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" className={iconTool} aria-label={t("older")} title={t("older")} disabled={older == null} onClick={() => openId(older)}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <EmailDeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        permanent={inTrash}
        isPending={emailAction.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
