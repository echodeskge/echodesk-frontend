"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Contact,
  MailOpen,
  MoreVertical,
  PlayCircle,
  PowerOff,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useMarkConversationUnread,
  useSetAIConversationState,
  useStartSession,
  useTransferChat,
} from "@/hooks/api/useSocial";
import { usePrefetchConversations, usePrefetchUnreadCount } from "@/hooks/api/usePrefetchSocial";
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

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";
const ghostBtn =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";
const primaryBtn =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

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
  const showSummary = useMessagesBetaStore((s) => s.showSummary);
  const setShowSummary = useMessagesBetaStore((s) => s.setShowSummary);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const selectChat = useMessagesBetaStore((s) => s.selectChat);
  const showClientPanel = useMessagesBetaStore((s) => s.showClientPanel);
  const setShowClientPanel = useMessagesBetaStore((s) => s.setShowClientPanel);
  const patchAssignment = useMessagesBetaStore((s) => s.patchAssignment);
  const patchArchive = useMessagesBetaStore((s) => s.patchArchive);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);

  const [busy, setBusy] = useState<"assign" | "unassign" | "archive" | "start" | "takeOver" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const startSession = useStartSession();
  const transferChat = useTransferChat();
  const markUnread = useMarkConversationUnread();
  const setUnread = useMessagesBetaStore((s) => s.setUnread);
  const setAiState = useMessagesBetaStore((s) => s.setAiState);
  const setAiMode = useSetAIConversationState();

  // Feature gate for the AI companion surfaces (summary button + AI pause/
  // resume). Mirrors settings-sidebar's hasFeatureAccess merge: explicit
  // feature_keys win; staff with no keys pass; otherwise hidden.
  const featureKeys: string[] = (() => {
    const raw = (profile as any)?.feature_keys;
    if (!raw) return [];
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  })();
  const isStaffOrAdmin = !!(user?.is_staff || user?.is_superuser);
  const hasAiCompanion =
    featureKeys.length > 0
      ? featureKeys.includes("ai_companion")
      : isStaffOrAdmin;
  // The AI can answer these platforms; email is summary-only.
  const aiReplyablePlatform = conversation.platform !== "email";
  const aiPaused = conversation.aiState === "off";

  const handleSetAiMode = async (mode: "ai" | "off") => {
    try {
      await setAiMode.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
        mode,
      });
      // Optimistic local patch; the ai_state_update WS echo reconciles
      // every other agent's UI.
      setAiState(conversation.id, mode === "ai" ? null : "off", null);
      toast.success(mode === "ai" ? t("aiResumed") : t("aiPaused"));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("aiModeFailed"));
    }
  };

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
  const isWidget = conversation.platform === "widget";
  // End session is surfaced inline whenever the chat is assigned to me
  // (assign auto-starts the session, so assigned-to-me always implies an
  // active session for FB/IG/WA; widget has an implicit session). The
  // backend rejects an end on a non-session assignment, so this is safe.
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

  // Admin "take over": reassigns a chat another agent holds to me.
  const handleTakeOver = async () => {
    if (busy || !user?.id) return;
    setBusy("takeOver");
    const displayName =
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
    const previousSlice = assignmentSlice;
    patchAssignment(conversation.id, {
      assignedUserId: user.id,
      assignedUserName: displayName,
      status: "in_session",
      sessionStartedAt: assignmentSlice?.sessionStartedAt ?? null,
      sessionEndedAt: null,
    });
    setAssignmentTab("assigned");
    try {
      await transferChat.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
        target_user_id: user.id,
      });
      toast.success(t("assignedToYou"));
    } catch (err: any) {
      patchAssignment(conversation.id, previousSlice);
      toast.error(err?.response?.data?.error || t("failedToTakeOver"));
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
    // End session unassigns AND archives server-side. Optimistically mirror
    // both so the actor's sidebar moves the chat into History immediately
    // (the backend's assignment_update + archive_update WS frames reconcile
    // every other agent). Without the local archive patch the chat would
    // flash back into the All tab until the archive_update lands.
    patchAssignment(conversation.id, null);
    patchArchive(conversation.id, {
      archivedAt: new Date().toISOString(),
      byUserId: user?.id ?? null,
    });
    if (useMessagesBetaStore.getState().selectedChatId === conversation.id) {
      selectChat(null);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {!isAssignedToMe && !isAssignedToOther && (
        <button
          type="button"
          onClick={handleAssignToMe}
          disabled={busy !== null}
          className={primaryBtn}
          aria-label={t("assignToMe")}
        >
          <UserPlus className="h-[13px] w-[13px]" />
          <span className="hidden sm:inline">{t("assignToMe")}</span>
        </button>
      )}
      {/* End session unassigns AND archives (moves to History); the confirm
          dialog keeps the rating prompt + widget close behaviour. */}
      {isAssignedToMe && (
        <button
          type="button"
          onClick={() => setEndSessionOpen(true)}
          onMouseEnter={handleEndSessionHover}
          disabled={busy !== null}
          className={ghostBtn}
          aria-label={t("endSession")}
        >
          <PowerOff className="h-[13px] w-[13px]" />
          <span className="hidden sm:inline">{t("endSession")}</span>
        </button>
      )}
      {isAssignedToOther && (
        <span className="hidden max-w-[160px] truncate px-1.5 text-xs text-muted-foreground lg:inline">
          {assignmentSlice?.assignedUserName
            ? t("assignedToWho", { name: assignmentSlice.assignedUserName })
            : t("assignedToAnotherAgent")}
        </span>
      )}
      {isAdmin && isAssignedToOther && (
        <button
          type="button"
          onClick={handleTakeOver}
          disabled={busy !== null}
          className={ghostBtn}
          aria-label={t("takeOver")}
        >
          <UserCheck className="h-[13px] w-[13px]" />
          <span className="hidden sm:inline">{t("takeOver")}</span>
        </button>
      )}

      <span className="mx-1 h-4 w-px bg-border" aria-hidden />

      {hasAiCompanion && (
        <button
          type="button"
          onClick={() => setShowSummary(!showSummary)}
          aria-label={t("aiSummary")}
          aria-pressed={showSummary}
          title={t("aiSummary")}
          className={cn(iconBtn, "hidden md:inline-flex", showSummary && "bg-muted text-foreground")}
        >
          <Sparkles className="h-[15px] w-[15px]" />
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowClientPanel(!showClientPanel)}
        aria-label={showClientPanel ? t("hideProfile") : t("viewProfile")}
        aria-pressed={showClientPanel}
        className={cn(ghostBtn, showClientPanel && "bg-muted text-foreground")}
      >
        <Contact className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("profile")}</span>
      </button>

      <button
        type="button"
        onClick={handleArchiveToggle}
        disabled={busy !== null}
        aria-label={isArchived ? t("restoreFromArchive") : t("archive")}
        title={isArchived ? t("restoreFromArchive") : t("archive")}
        className={iconBtn}
      >
        {isArchived ? <ArchiveRestore className="h-[15px] w-[15px]" /> : <Archive className="h-[15px] w-[15px]" />}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t("moreActions")} className={iconBtn}>
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Transfer: the holder can hand off; admins can reassign another
              agent's chat (mirrors backend transfer_chat). */}
          {(isAssignedToMe || (isAdmin && isAssignedToOther)) && (
            <DropdownMenuItem onSelect={() => setTransferOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              {t("transferToTeammate")}
            </DropdownMenuItem>
          )}
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
          {hasAiCompanion && (
            <DropdownMenuItem className="md:hidden" onSelect={() => setShowSummary(!showSummary)}>
              <Sparkles className="h-4 w-4 mr-2" />
              {t("aiSummary")}
            </DropdownMenuItem>
          )}
          {hasAiCompanion && aiReplyablePlatform && (
            <DropdownMenuItem
              onSelect={() => void handleSetAiMode(aiPaused || conversation.aiState === "needs_human" ? "ai" : "off")}
              disabled={setAiMode.isPending}
            >
              <Bot className="h-4 w-4 mr-2" />
              {aiPaused || conversation.aiState === "needs_human" ? t("resumeAi") : t("pauseAi")}
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
