"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Contact,
  MailOpen,
  MoreVertical,
  PlayCircle,
  PowerOff,
  Trash2,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarkConversationUnread, useStartSession } from "@/hooks/api/useSocial";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";
import { registerEndedChat } from "../end-session-block";
import { MessagesBetaTransferDialog } from "./MessagesBetaTransferDialog";
import { MessagesBetaEndSessionDialog } from "./MessagesBetaEndSessionDialog";
import { MessagesBetaDeleteDialog } from "./MessagesBetaDeleteDialog";

interface Props {
  conversation: ConversationRow;
}

/**
 * /messages-beta header actions. Mirrors the legacy chat-header-actions
 * surface area for the four social platforms (FB / IG / WA / widget):
 *
 *   • Assign to me / Unassign (inline buttons)
 *   • Archive / Restore        (inline button — Restore label when archived)
 *   • Transfer                 (dialog with user picker)
 *   • Start session            (when assignment.status === 'active')
 *   • End session              (when assignment.status === 'in_session', or widget)
 *   • Delete conversation      (admin only — confirm dialog)
 *
 * All backend mutations already broadcast the right WS frame (assignment_update
 * / archive_update / read_state_update — PR3) so the store updates land
 * cross-user without any extra plumbing here. Delete is the one exception
 * that needs PR F's `conversation_deleted` broadcast for cross-agent live
 * removal; locally we strip via `removeConversation`.
 *
 * Connection-status dot is rendered to the left of the menu and bound to
 * `wsState` so agents can spot a broken socket at a glance.
 */
export function MessagesBetaHeaderActions({ conversation }: Props) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const assignmentSlice = useMessagesBetaStore(
    (s) => s.assignmentByChatId[conversation.id] ?? null
  );
  const archiveMeta = useMessagesBetaStore(
    (s) => s.archivedByChatId[conversation.id] ?? null
  );
  const wsState = useMessagesBetaStore((s) => s.wsState);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const selectChat = useMessagesBetaStore((s) => s.selectChat);
  const showClientPanel = useMessagesBetaStore((s) => s.showClientPanel);
  const setShowClientPanel = useMessagesBetaStore((s) => s.setShowClientPanel);

  const [busy, setBusy] = useState<"assign" | "unassign" | "archive" | "start" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const startSession = useStartSession();
  const markUnread = useMarkConversationUnread();
  const setUnread = useMessagesBetaStore((s) => s.setUnread);

  const isAdmin = !!profile?.is_staff;
  const isAssignedToMe = !!assignmentSlice && assignmentSlice.assignedUserId === user?.id;
  const isAssignedToOther =
    !!assignmentSlice && assignmentSlice.assignedUserId != null && !isAssignedToMe;
  const isArchived = !!archiveMeta;
  const isActiveAssignment = assignmentSlice?.status === "active";
  const isInSession = assignmentSlice?.status === "in_session";
  const isWidget = conversation.platform === "widget";
  // Widget conversations always have an implicit session; for the other
  // platforms we surface End session only after Start session has flipped
  // the assignment into `in_session`.
  const canEndSession = isAssignedToMe && (isInSession || isWidget);
  const canStartSession = isAssignedToMe && isActiveAssignment && !isWidget;

  const handleAssignToMe = async () => {
    if (busy) return;
    setBusy("assign");
    try {
      await axios.post("/api/social/assignments/assign/", {
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
      });
      // Mirror legacy: if the agent assigned from history view, also lift
      // the archive flag so the chat reappears in their active inbox.
      if (isArchived) {
        await axios
          .post("/api/social/conversations/unarchive/", {
            conversations: [
              {
                platform: conversation.platform,
                conversation_id: conversation.conversationKey,
                account_id: conversation.accountId,
              },
            ],
          })
          .catch(() => {
            /* archive failure is non-fatal here */
          });
        setShowArchived(false);
      }
      toast.success("Assigned to you");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to assign");
    } finally {
      setBusy(null);
    }
  };

  const handleUnassign = async () => {
    if (busy) return;
    setBusy("unassign");
    try {
      await axios.post("/api/social/assignments/unassign/", {
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
      });
      toast.success("Unassigned");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to unassign");
    } finally {
      setBusy(null);
    }
  };

  const handleArchiveToggle = async () => {
    if (busy) return;
    setBusy("archive");
    const endpoint = isArchived
      ? "/api/social/conversations/unarchive/"
      : "/api/social/conversations/archive/";
    try {
      await axios.post(endpoint, {
        conversations: [
          {
            platform: conversation.platform,
            conversation_id: conversation.conversationKey,
            account_id: conversation.accountId,
          },
        ],
      });
      toast.success(isArchived ? "Restored from archive" : "Archived");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to archive");
    } finally {
      setBusy(null);
    }
  };

  const handleStartSession = async () => {
    if (busy) return;
    setBusy("start");
    try {
      await startSession.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
      });
      toast.success("Session started");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to start session");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Called from MessagesBetaEndSessionDialog after the mutation resolves.
   * Mirrors legacy chat-box-header.tsx:88-96 — strip the chat out of the
   * active UI immediately rather than waiting for the WS `session_ended`
   * frame to bounce back, AND register the chat in the 60s block window
   * so the rating-request `new_message` echo can't resurrect it in the
   * sidebar before `archive_update` catches up.
   */
  const handleMarkUnread = async () => {
    try {
      await markUnread.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
      });
      // Locally bump the unread badge so the sidebar reflects the action
      // immediately. The `read_state_update` WS broadcast (PR3) reconciles
      // every other agent's UI without an extra round trip.
      setUnread(conversation.id, Math.max(1, conversation.unreadCount || 0));
      toast.success("Marked as unread");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to mark as unread");
    }
  };

  const handleEndedSession = () => {
    registerEndedChat(conversation.id);
    if (useMessagesBetaStore.getState().selectedChatId === conversation.id) {
      selectChat(null);
    }
  };

  const wsDotTitle =
    wsState === "open"
      ? "Live connection: connected"
      : wsState === "connecting" || wsState === "reconnecting"
      ? "Live connection: reconnecting"
      : "Live connection: offline";

  return (
    <div className="flex items-center gap-1">
      {/* Connection-status dot — green when WS is open, amber while
          reconnecting, red when down. Pure presentation, no clicks. */}
      <span
        className={cn(
          "h-2 w-2 rounded-full mr-1 shrink-0",
          wsState === "open" && "bg-emerald-500",
          (wsState === "connecting" || wsState === "reconnecting") &&
            "bg-amber-500 animate-pulse",
          (wsState === "idle" || wsState === "down") && "bg-rose-500"
        )}
        title={wsDotTitle}
        aria-label={wsDotTitle}
      />

      {!isAssignedToMe && !isAssignedToOther && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAssignToMe}
          disabled={busy !== null}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Assign to me
        </Button>
      )}
      {isAssignedToMe && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUnassign}
          disabled={busy !== null}
        >
          <UserX className="h-4 w-4 mr-1" />
          Unassign
        </Button>
      )}
      {isAssignedToOther && (
        <span className="text-xs text-muted-foreground px-2">
          Assigned to {assignmentSlice?.assignedUserName || "another agent"}
        </span>
      )}

      <Button
        type="button"
        variant={showClientPanel ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setShowClientPanel(!showClientPanel)}
        aria-label={showClientPanel ? "Hide profile" : "View profile"}
        aria-pressed={showClientPanel}
      >
        <Contact className="h-4 w-4 mr-1" />
        Profile
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleArchiveToggle}
        disabled={busy !== null}
        aria-label={isArchived ? "Restore from archive" : "Archive"}
      >
        {isArchived ? (
          <>
            <ArchiveRestore className="h-4 w-4 mr-1" />
            Restore
          </>
        ) : (
          <>
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="More actions"
            className="px-2"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setTransferOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Transfer to teammate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleMarkUnread} disabled={markUnread.isPending}>
            <MailOpen className="h-4 w-4 mr-2" />
            Mark as unread
          </DropdownMenuItem>
          {canStartSession && (
            <DropdownMenuItem onSelect={handleStartSession} disabled={busy === "start"}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start session
            </DropdownMenuItem>
          )}
          {canEndSession && (
            <DropdownMenuItem onSelect={() => setEndSessionOpen(true)}>
              <PowerOff className="h-4 w-4 mr-2" />
              End session
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete conversation
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <MessagesBetaTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        conversation={conversation}
      />
      <MessagesBetaEndSessionDialog
        open={endSessionOpen}
        onOpenChange={setEndSessionOpen}
        conversation={conversation}
        onEnded={handleEndedSession}
      />
      <MessagesBetaDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        conversation={conversation}
      />
    </div>
  );
}
