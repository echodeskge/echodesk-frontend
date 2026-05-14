"use client";

import { useState } from "react";
import { Archive, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";

import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
}

/**
 * Minimal /messages-beta header action strip: Assign to me / Unassign +
 * Archive. Each button POSTs to the same REST endpoint the legacy page
 * uses; the backend's new assignment_update / archive_update broadcasts
 * (PR3) reconcile every other agent's UI without any extra work here.
 *
 * Out of scope for this strip (additive later): Transfer (needs user
 * picker), End session w/ rating flow, Restore from history, full menu.
 */
export function MessagesBetaHeaderActions({ conversation }: Props) {
  const { user } = useAuth();
  const assignmentSlice = useMessagesBetaStore(
    (s) => s.assignmentByChatId[conversation.id] ?? null
  );
  const archiveMeta = useMessagesBetaStore(
    (s) => s.archivedByChatId[conversation.id] ?? null
  );

  const [busy, setBusy] = useState<"assign" | "unassign" | "archive" | null>(null);

  // chatId layout for the three social platforms + widget:
  //   fb_<page>_<sender>   ig_<account>_<sender>
  //   wa_<waba>_<number>   widget_<connection>_<session>
  // The REST endpoints take (platform, conversation_id, account_id) keyed
  // off the second + remainder underscore segments.
  const parts = conversation.id.split("_");
  if (parts.length < 3) return null;
  const accountId = parts[1];
  const conversationKey = parts.slice(2).join("_");

  const isAssignedToMe = !!assignmentSlice && assignmentSlice.assignedUserId === user?.id;
  const isAssignedToOther =
    !!assignmentSlice && assignmentSlice.assignedUserId != null && !isAssignedToMe;
  const isArchived = !!archiveMeta;

  const handleAssignToMe = async () => {
    if (busy) return;
    setBusy("assign");
    try {
      await axios.post("/api/social/assignments/assign/", {
        platform: conversation.platform,
        conversation_id: conversationKey,
        account_id: accountId,
      });
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
        conversation_id: conversationKey,
        account_id: accountId,
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
            conversation_id: conversationKey,
            account_id: accountId,
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

  return (
    <div className="flex items-center gap-1">
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
        variant="ghost"
        size="sm"
        onClick={handleArchiveToggle}
        disabled={busy !== null}
        aria-label={isArchived ? "Restore from archive" : "Archive"}
      >
        <Archive className="h-4 w-4 mr-1" />
        {isArchived ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}
