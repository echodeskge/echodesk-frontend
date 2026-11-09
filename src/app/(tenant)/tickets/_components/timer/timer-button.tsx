"use client";

/**
 * The detail header's personal timer button (plan U1, D104, DC21, E32, FE-13).
 *
 * - Idle: `Play` + my total on this ticket as "HH:MM:SS" ("00:00:00" at zero).
 * - Running: `Pause` + my live total, in the running colours. The clock ticks
 *   from the server's `server_now` plus the time since the fetch, never from
 *   the client clock's absolute value (RM1).
 * - Start → `timerStart`. A 409 `timer_running` opens the switch dialog
 *   (stop it and start here / open that ticket / cancel); a 409
 *   `ticket_closed` shows a toast. Stop → `timerStop`.
 * - After 8 hours of one run the button turns amber and its tooltip suggests
 *   stopping.
 *
 * It renders inside the app header slot, outside the tickets route layout:
 * the shell re-provides the route's intl messages there, and react-query is
 * global (see `[id]/_components/section-contracts.ts`). 28px high (D104).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTimer } from "../../_lib/format";
import type { TimerConflict } from "../../_lib/types";
import {
  LONG_RUNNING_SECONDS,
  entryElapsedSeconds,
  liveTotals,
  timerConflictOf,
  useNow,
  useRefetchTimerOnColumnChange,
  useTicketTimer,
  useTimerMutations,
} from "../../_hooks/use-ticket-timer";
import { useTicket } from "../../_hooks/use-ticket";
import type { TimerSectionProps } from "../../[id]/_components/section-contracts";

type Running = NonNullable<TimerConflict["running"]>;

const BASE =
  "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium leading-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const IDLE = "border-border bg-transparent text-foreground";
const RUNNING = "border-primary bg-primary text-primary-foreground";
const LONG = "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950";

export function TimerButton({ ticketId }: TimerSectionProps) {
  const t = useTranslations("ticketsScreen.timer");
  const router = useRouter();
  const timer = useTicketTimer(ticketId);
  const { start, stop } = useTimerMutations(ticketId);
  const [conflict, setConflict] = useState<Running | null>(null);
  // Shares the screen's `tk.ticket(id)` cache entry; a column change (e.g. a
  // move into a closed column, which stops timers server side) refetches.
  const ticket = useTicket(ticketId);
  useRefetchTimerOnColumnChange(ticketId, ticket.data?.column?.id);

  const snapshot = timer.data;
  const running = snapshot?.running ?? null;
  const now = useNow(Boolean(running));
  const mine = snapshot ? liveTotals(snapshot, now).mine : 0;
  const runSeconds = running && snapshot ? entryElapsedSeconds(running, snapshot, now) : 0;
  const longRunning = Boolean(running) && runSeconds >= LONG_RUNNING_SECONDS;
  const busy = start.isPending || stop.isPending;

  const onStartError = (error: unknown) => {
    const c = timerConflictOf(error);
    if (c?.code === "timer_running" && c.running) {
      setConflict(c.running);
      return;
    }
    if (c?.code === "ticket_closed") {
      toast.error(t("ticketClosed"));
      return;
    }
    toast.error(t("error"));
  };

  const toggle = () => {
    if (!snapshot || busy) return;
    if (running) {
      stop.mutate(undefined, {
        onError: (error) => {
          if (timerConflictOf(error)?.code !== "timer_not_running") toast.error(t("error"));
        },
      });
    } else {
      start.mutate({}, { onError: onStartError });
    }
  };

  const switchHere = () => {
    const other = conflict;
    setConflict(null);
    start.mutate({ switch: true, otherTicketId: other?.ticket_id ?? null }, { onError: onStartError });
  };

  const label = running ? t("stop") : t("start");
  const Icon = running ? Pause : Play;

  const button = (
    <button
      type="button"
      data-slot="timer-button"
      data-testid="timer-button"
      data-running={running ? "true" : "false"}
      data-long-running={longRunning ? "true" : undefined}
      aria-label={label}
      aria-pressed={Boolean(running)}
      title={longRunning ? undefined : label}
      disabled={!snapshot || busy}
      onClick={toggle}
      className={cn(BASE, running ? (longRunning ? LONG : RUNNING) : IDLE)}
    >
      <Icon aria-hidden="true" size={13} className="shrink-0" />
      <span data-testid="timer-text" className="font-mono tabular-nums">
        {formatTimer(mine)}
      </span>
      {longRunning && <span className="sr-only">{t("longRunningHint")}</span>}
    </button>
  );

  return (
    <>
      {/* Always wrapped, so the button keeps its place in the tree; the
          tooltip only opens once the run passes 8 hours. */}
      <Tooltip open={longRunning ? undefined : false}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent sideOffset={6}>{t("longRunningHint")}</TooltipContent>
      </Tooltip>
      <AlertDialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <AlertDialogContent data-testid="timer-switch-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {conflict?.ticket_title
                ? t("runningElsewhere", { id: conflict.ticket_id, title: conflict.ticket_title })
                : t("runningElsewhereNoTitle", { id: conflict?.ticket_id ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("switchBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              data-testid="timer-open-other"
              onClick={() => {
                const id = conflict?.ticket_id;
                setConflict(null);
                if (id) router.push(`/tickets/${id}`);
              }}
            >
              {t("openTicket")}
            </Button>
            <AlertDialogAction
              data-testid="timer-switch-here"
              onClick={(e) => {
                e.preventDefault();
                switchHere();
              }}
            >
              {t("switchHere")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
