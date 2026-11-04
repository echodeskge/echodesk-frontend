"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Archive,
  FolderInput,
  MailOpen,
  MoreVertical,
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { useSidebarFolders } from "../_hooks/use-sidebar-folders";
import { EmailDeleteConfirmDialog } from "./email-delete-confirm-dialog";

interface EmailViewContentActionsProps {
  email: EmailMessage;
  /** List route the message was opened from (where we return after acting). */
  filter?: string;
}

/**
 * Reading-pane toolbar (Outlook): Delete (moves to Deleted Items; permanent in
 * Trash) with confirmation, Restore (in Trash), Archive, Move to…, Star and
 * Mark as unread.
 */
export function EmailViewContentActions({
  email,
  filter,
}: EmailViewContentActionsProps) {
  const emailAction = useEmailAction();
  const moveEmail = useMoveEmail();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("email.view");
  const tList = useTranslations("email.list");
  const folderLabel = useFolderLabel();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { folders } = useSidebarFolders(email.connection_id);
  const inTrash = isTrashFolder(email.folder);
  const currentRole = classifyFolderRole(email.folder);
  const archiveFolder = folders.find((f) => f.role === "archive");
  const moveTargets = folders.filter(
    (f) =>
      f.role !== "drafts" &&
      f.name !== email.folder &&
      !(currentRole !== "custom" && f.role === currentRole)
  );
  const canMove = !!email.message_id;

  function backToList() {
    router.push(`/email/${encodeURIComponent(filter || email.folder || "INBOX")}`);
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
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={inTrash ? t("deletePermanently") : t("deleteEmail")}
          title={inTrash ? t("deletePermanently") : t("deleteEmail")}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        {inTrash && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestore}
            disabled={emailAction.isPending}
          >
            <RotateCcw className="me-2 h-4 w-4" />
            {t("restore")}
          </Button>
        )}
        {archiveFolder && currentRole !== "archive" && canMove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMove(archiveFolder)}
            disabled={moveEmail.isPending}
          >
            <Archive className="me-2 h-4 w-4" />
            {t("archive")}
          </Button>
        )}
        {canMove && moveTargets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={moveEmail.isPending}>
                <FolderInput className="me-2 h-4 w-4" />
                {t("moveTo")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              {moveTargets.map((folder) => (
                <DropdownMenuItem
                  key={`${folder.role}:${folder.name}`}
                  onClick={() => handleMove(folder)}
                >
                  {folderLabel(folder)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={email.is_starred ? t("unstarEmail") : t("starEmail")}
          onClick={handleToggleStar}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("moreActions")}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMarkUnread}>
              <MailOpen className="me-2 h-4 w-4" />
              {t("markAsUnread")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
