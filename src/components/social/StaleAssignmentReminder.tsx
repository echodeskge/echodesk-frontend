"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BellRing, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { socialConversationsRetrieve } from "@/api/generated";
import type { UnifiedConversation } from "@/api/generated/interfaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  socialKeys,
  useEndSession,
  useEndWidgetSession,
  useSocialSettings,
  useUnassignChat,
} from "@/hooks/api/useSocial";
import {
  computeStaleChats,
  getAssignmentActionKey,
  lastActivityMs,
  staleSignature,
} from "@/lib/staleAssignments";

const SNOOZE_KEY_PREFIX = "stale_reminder_snoozed_until_";
const SNOOZE_MS = 15 * 60_000;
const POLL_MS = 60_000;

/**
 * App-wide reminder popup about assigned chats with no recent activity.
 * Mounted in the tenant layout; fully gated by the admin-controlled
 * `stale_assignment_reminder_enabled` social setting — tenants with the
 * feature off never poll.
 *
 * Re-show rules: dismissing acknowledges the current stale set (re-pops
 * only when a NEW chat goes stale); snoozing suppresses for 15 minutes
 * (persisted per user in localStorage, so a refresh doesn't re-pop).
 */
export function StaleAssignmentReminder() {
  const t = useTranslations("staleReminder");
  const router = useRouter();
  const { user } = useAuth();
  const { data: settings } = useSocialSettings();

  const reminderEnabled = !!settings?.stale_assignment_reminder_enabled && !!user?.id;
  const thresholdMinutes = settings?.stale_assignment_reminder_minutes ?? 60;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [acknowledgedSignature, setAcknowledgedSignature] = useState<string | null>(null);
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const endSession = useEndSession();
  const unassignChat = useUnassignChat();
  const endWidgetSession = useEndWidgetSession();

  const snoozeKey = `${SNOOZE_KEY_PREFIX}${user?.id ?? "anon"}`;
  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    const raw = window.localStorage.getItem(snoozeKey);
    if (raw) setSnoozedUntil(Number(raw) || 0);
  }, [snoozeKey, user?.id]);

  const { data } = useQuery({
    queryKey: socialKeys.staleReminder(),
    queryFn: () =>
      socialConversationsRetrieve(undefined, true, undefined, undefined, 1, 50),
    refetchInterval: POLL_MS,
    enabled: reminderEnabled,
  });

  const staleChats = useMemo(() => {
    if (!reminderEnabled) return [];
    const rows = data?.results ?? [];
    return computeStaleChats(rows, thresholdMinutes, Date.now()).filter(
      (row) => !handledIds.has(row.conversation_id)
    );
  }, [data, thresholdMinutes, handledIds, reminderEnabled]);

  // Locally-handled rows are filtered out until the NEXT poll confirms them
  // gone server-side. Clearing on any earlier event (close/dismiss) would
  // resurrect the just-handled chat from the cached poll data and re-open
  // the dialog in a loop.
  useEffect(() => {
    setHandledIds(new Set());
  }, [data]);

  // Popup visibility: open on a fresh stale set, auto-close when it empties.
  useEffect(() => {
    if (!reminderEnabled) return;
    if (dialogOpen) {
      if (staleChats.length === 0) {
        setDialogOpen(false);
        setAcknowledgedSignature(null);
      }
      return;
    }
    if (staleChats.length === 0) return;
    if (Date.now() < snoozedUntil) return;
    if (staleSignature(staleChats) === acknowledgedSignature) return;
    setDialogOpen(true);
  }, [staleChats, dialogOpen, snoozedUntil, acknowledgedSignature, reminderEnabled]);

  if (!reminderEnabled) return null;

  const handleDismiss = () => {
    setAcknowledgedSignature(staleSignature(staleChats));
    setDialogOpen(false);
  };

  const handleSnooze = () => {
    const until = Date.now() + SNOOZE_MS;
    setSnoozedUntil(until);
    try {
      window.localStorage.setItem(snoozeKey, String(until));
    } catch {
      // localStorage unavailable (private mode) — in-memory snooze still applies
    }
    setDialogOpen(false);
  };

  const handleOpenChat = (row: UnifiedConversation) => {
    setAcknowledgedSignature(staleSignature(staleChats));
    setDialogOpen(false);
    router.push(`/social/messages/${row.conversation_id}`);
  };

  const usesEndSession = (row: UnifiedConversation) =>
    row.platform === "widget" ||
    (!!settings?.session_management_enabled && row.assignment_status === "in_session");

  const handleEndChat = async (row: UnifiedConversation) => {
    const key = getAssignmentActionKey(row);
    setBusyId(row.conversation_id);
    try {
      if (row.platform === "widget") {
        await endWidgetSession.mutateAsync({
          connection_id: Number(row.account_id),
          session_id: key.conversation_id,
        });
        toast.success(t("sessionEnded"));
      } else if (usesEndSession(row)) {
        try {
          await endSession.mutateAsync(key);
          toast.success(t("sessionEnded"));
        } catch (err) {
          // 400: session management disabled; 404: assignment not in_session
          // anymore — fall back to a silent unassign so the chat still gets
          // released.
          const statusCode = (err as { response?: { status?: number } })?.response
            ?.status;
          if (statusCode === 400 || statusCode === 404) {
            await unassignChat.mutateAsync(key);
            toast.success(t("chatUnassigned"));
          } else {
            throw err;
          }
        }
      } else {
        await unassignChat.mutateAsync(key);
        toast.success(t("chatUnassigned"));
      }
      setHandledIds((prev) => new Set(prev).add(row.conversation_id));
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      toast.error(message || t("actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(o) => {
        if (!o) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { minutes: thresholdMinutes })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {staleChats.map((row) => (
            <div
              key={row.conversation_id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {row.sender_name || row.sender_id}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {row.platform}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("lastActivity", {
                    time: formatDistanceToNow(new Date(lastActivityMs(row)), {
                      addSuffix: true,
                    }),
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleOpenChat(row)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("openChat")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === row.conversation_id}
                  onClick={() => handleEndChat(row)}
                >
                  {usesEndSession(row) ? t("endSession") : t("unassign")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleDismiss}>
            {t("dismiss")}
          </Button>
          <Button variant="secondary" onClick={handleSnooze}>
            {t("snooze")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StaleAssignmentReminder;
