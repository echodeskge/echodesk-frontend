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
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarkConversationUnread, useStartSession } from "@/hooks/api/useSocial";
import { usePrefetchConversations, usePrefetchUnreadCount } from "@/hooks/api/usePrefetchSocial";
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
  const t = useTranslations("messagesBeta.header");
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
  const patchAssignment = useMessagesBetaStore((s) => s.patchAssignment);
  const patchArchive = useMessagesBetaStore((s) => s.patchArchive);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);

  const [busy, setBusy] = useState<"assign" | "unassign" | "archive" | "start" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const startSession = useStartSession();
  const markUnread = useMarkConversationUnread();
  const setUnread = useMessagesBetaStore((s) => s.setUnread);

  // Prefetch the assigned-conversations + unread-count caches when the
  // user hovers End Session — mirrors legacy chat-box-header.tsx:64-69.
  // Cuts the perceived latency between clicking End Session and the
  // sidebar/badge updating once the mutation lands.
  const prefetchAssignedConversations = usePrefetchConversations("assigned");
  const prefetchUnread = usePrefetchUnreadCount();
  const handleEndSessionHover = () => {
    prefetchAssignedConversations();
    prefetchUnread();
  };

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
    if (busy || !user?.id) return;
    setBusy("assign");

    // Optimistic local patch — flips the sidebar selector immediately so the
    // chat moves from All → Assigned without waiting for the WS
    // `assignment_update` echo. Other agents still get the move via WS.
    const displayName =
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
    const previousSlice = assignmentSlice;
    patchAssignment(conversation.id, {
      assignedUserId: user.id,
      assignedUserName: displayName,
      status: "active",
      sessionStartedAt: null,
      sessionEndedAt: null,
    });
    // Switch tabs so the user follows the chat into Assigned — without
    // this the chat appears to vanish (the All tab hides MY chats when
    // chat_assignment_enabled is on).
    setAssignmentTab("assigned");
    if (isArchived) {
      patchArchive(conversation.id, null);
      setShowArchived(false);
    }

    try {
      await axios.post("/api/social/assignments/assign/", {
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
      });
      // Mirror legacy: if the agent assigned from history view, also lift
      // the archive flag on the server so the chat reappears in their
      // active inbox after reload too.
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
      }
      toast.success(t("assignedToYou"));
    } catch (err: any) {
      // Roll back the optimistic patch on failure.
      patchAssignment(conversation.id, previousSlice);
      toast.error(err?.response?.data?.error || t("failedToAssign"));
    } finally {
      setBusy(null);
    }
  };

  const handleUnassign = async () => {
    if (busy) return;
    setBusy("unassign");

    // Optimistic null-patch — the sidebar selector restores the chat to All
    // and drops it from Assigned the moment the user clicks.
    const previousSlice = assignmentSlice;
    patchAssignment(conversation.id, null);
    setAssignmentTab("all");

    try {
      await axios.post("/api/social/assignments/unassign/", {
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
      });
      toast.success(t("unassigned"));
    } catch (err: any) {
      patchAssignment(conversation.id, previousSlice);
      toast.error(err?.response?.data?.error || t("failedToUnassign"));
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
      toast.success(isArchived ? t("restoredFromArchive") : t("archived"));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("failedToArchive"));
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
      toast.success(t("sessionStarted"));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("failedToStartSession"));
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
      toast.success(t("markedAsUnread"));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("failedToMarkUnread"));
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
      ? t("wsConnected")
      : wsState === "connecting" || wsState === "reconnecting"
      ? t("wsReconnecting")
      : t("wsOffline");

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
          {t("assignToMe")}
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
          {t("unassign")}
        </Button>
      )}
      {isAssignedToOther && (
        <span className="text-xs text-muted-foreground px-2">
          {assignmentSlice?.assignedUserName
            ? t("assignedToWho", { name: assignmentSlice.assignedUserName })
            : t("assignedToAnotherAgent")}
        </span>
      )}

      <Button
        type="button"
        variant={showClientPanel ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setShowClientPanel(!showClientPanel)}
        aria-label={showClientPanel ? t("hideProfile") : t("viewProfile")}
        aria-pressed={showClientPanel}
      >
        <Contact className="h-4 w-4 mr-1" />
        {t("profile")}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleArchiveToggle}
        disabled={busy !== null}
        aria-label={isArchived ? t("restoreFromArchive") : t("archive")}
      >
        {isArchived ? (
          <>
            <ArchiveRestore className="h-4 w-4 mr-1" />
            {t("restore")}
          </>
        ) : (
          <>
            <Archive className="h-4 w-4 mr-1" />
            {t("archive")}
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("moreActions")}
            className="px-2"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setTransferOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            {t("transferToTeammate")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleMarkUnread} disabled={markUnread.isPending}>
            <MailOpen className="h-4 w-4 mr-2" />
            {t("markAsUnread")}
          </DropdownMenuItem>
          {canStartSession && (
            <DropdownMenuItem onSelect={handleStartSession} disabled={busy === "start"}>
              <PlayCircle className="h-4 w-4 mr-2" />
              {t("startSession")}
            </DropdownMenuItem>
          )}
          {canEndSession && (
            <DropdownMenuItem
              onSelect={() => setEndSessionOpen(true)}
              onMouseEnter={handleEndSessionHover}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              {t("endSession")}
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
                {t("deleteConversation")}
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
