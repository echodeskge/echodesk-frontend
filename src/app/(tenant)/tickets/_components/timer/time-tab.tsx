"use client";

/**
 * The activity feed's "Time" tab (plan U1, U5, W84, critic 13, FE-13).
 * FE-11's ActivityFeed renders `<TimeTab ticketId={id} />` as the panel of
 * the Time tab (its count is `useTicketTimer(id).data?.entries.length`).
 *
 * - **Logged time** (the personal timer, A14): per-person totals, then the
 *   latest entries: who ("Deleted user" when the user is gone), start–end,
 *   duration, and a "Running" flag with a live duration.
 * - **Time in status** (`time-logs/ticket_summary/`, the old TimeTracking
 *   panel): the per-column durations, the total, and the current column with
 *   a live counter when that column has `track_time`.
 *
 * Live values tick from the server's numbers plus the time since the fetch
 * (RM1), never from the client clock's absolute value.
 */
import { useId } from "react";
import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration } from "../../_lib/format";
import type { TimeEntry } from "../../_lib/types";
import {
  entryElapsedSeconds,
  liveTotals,
  secondsSinceFetch,
  useNow,
  useTicketTimer,
  useTicketTimeSummary,
  type TimerSnapshot,
} from "../../_hooks/use-ticket-timer";
import { useTicket } from "../../_hooks/use-ticket";
import { ColorDot } from "../primitives/color-dot";
import { initials } from "../primitives/initials";
import { SectionLabel } from "../primitives/section-label";
import type { TimerSectionProps } from "../../[id]/_components/section-contracts";

const AVATAR =
  "flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold leading-none text-primary";

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeOfDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Nov 5, 14:05 – 15:20" (end on another day gets its date too). */
function entryRange(entry: TimeEntry, locale: string): string {
  const start = formatDateTime(entry.started_at, locale);
  if (!entry.ended_at) return start;
  const s = new Date(entry.started_at);
  const e = new Date(entry.ended_at);
  if (Number.isNaN(e.getTime())) return start;
  return `${start} – ${sameLocalDay(s, e) ? timeOfDay(e) : formatDateTime(entry.ended_at, locale)}`;
}

function LoggedTime({ snapshot, now }: { snapshot: TimerSnapshot; now: number }) {
  const t = useTranslations("ticketsScreen");
  const locale = useLocale();
  const headingId = useId();
  const totals = liveTotals(snapshot, now);
  const userName = (u: TimeEntry["user"]) => u?.name || t("activity.deletedUser");

  return (
    <section aria-labelledby={headingId} data-testid="time-logged" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <SectionLabel as="h3" id={headingId}>
          {t("timer.logged")}
        </SectionLabel>
        {snapshot.entries.length > 0 && (
          <span data-testid="time-logged-total" className="ml-auto text-xs tabular-nums text-muted-foreground">
            {t("timer.total", { time: formatDuration(totals.total, locale) })}
          </span>
        )}
      </div>

      {snapshot.entries.length === 0 ? (
        <p data-testid="time-logged-empty" className="text-[13px] text-muted-foreground">
          {t("timer.noEntries")}
        </p>
      ) : (
        <>
          {totals.byUser.length > 0 && (
            <ul aria-label={t("timer.byPerson")} data-testid="time-by-user" className="flex flex-wrap gap-1.5">
              {totals.byUser.map((row, i) => (
                <li
                  key={row.user?.id ?? `deleted-${i}`}
                  className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted pl-1 pr-2 text-xs"
                >
                  <span aria-hidden="true" className={AVATAR}>
                    {row.user?.initials || initials(userName(row.user))}
                  </span>
                  <span className="font-medium">{userName(row.user)}</span>
                  <span className="tabular-nums text-muted-foreground">{formatDuration(row.seconds, locale)}</span>
                </li>
              ))}
            </ul>
          )}
          <ul data-testid="time-entries" className="flex flex-col divide-y rounded-lg border">
            {snapshot.entries.map((entry) => {
              const seconds = entryElapsedSeconds(entry, snapshot, now);
              return (
                <li
                  key={entry.id}
                  data-testid="time-entry"
                  data-running={entry.is_running ? "true" : undefined}
                  className="flex min-h-9 items-center gap-2.5 px-3 py-1.5 text-xs"
                >
                  <span aria-hidden="true" className={AVATAR}>
                    {entry.user?.initials || initials(userName(entry.user))}
                  </span>
                  <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
                    <span className="block truncate font-medium">{userName(entry.user)}</span>
                    <span className="block truncate text-muted-foreground">{entryRange(entry, locale)}</span>
                  </span>
                  {entry.is_running && (
                    <span className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded bg-green/10 px-1.5 text-[10px] font-semibold text-green">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-green motion-safe:animate-pulse" />
                      {t("timer.active")}
                    </span>
                  )}
                  <span className="shrink-0 font-mono tabular-nums">{formatDuration(seconds, locale)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function TimeInStatus({ ticketId }: { ticketId: number }) {
  const t = useTranslations("ticketsScreen");
  const locale = useLocale();
  const headingId = useId();
  const summary = useTicketTimeSummary(ticketId);
  const ticket = useTicket(ticketId);
  const data = summary.data;
  const column = ticket.data?.column;
  const active = data?.active ?? null;
  const tracked = Boolean(active && column?.track_time && (!column.id || active.column.id === column.id));
  const now = useNow(tracked);
  const activeSeconds = active && data ? active.elapsed_seconds + secondsSinceFetch(data, now) : 0;
  const total = (data?.total_seconds ?? 0) + (tracked ? activeSeconds : 0);
  const empty = !data || (data.by_column.length === 0 && !active);

  return (
    <section aria-labelledby={headingId} data-testid="time-in-status" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <SectionLabel as="h3" id={headingId}>
          {t("timer.timeInStatus")}
        </SectionLabel>
        {!empty && (
          <span data-testid="time-status-total" className="ml-auto text-xs tabular-nums text-muted-foreground">
            {t("timer.total", { time: formatDuration(total, locale) })}
          </span>
        )}
      </div>

      {summary.isLoading ? (
        <div aria-hidden="true" className="h-9 animate-pulse rounded-lg bg-muted/60" />
      ) : empty ? (
        <p data-testid="time-status-empty" className="text-[13px] text-muted-foreground">
          {t("timer.noStatusTime")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {active && (
            <li
              data-testid="time-status-active"
              data-live={tracked ? "true" : undefined}
              className="flex min-h-9 items-center gap-2.5 bg-muted/30 px-3 py-1.5 text-xs"
            >
              <ColorDot color={active.column.color} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {t("timer.currentlyIn", { column: active.column.name })}
              </span>
              {tracked ? (
                <span className="shrink-0 font-mono tabular-nums">{formatDuration(activeSeconds, locale)}</span>
              ) : (
                <span className="shrink-0 text-muted-foreground">{t("timer.notTracked")}</span>
              )}
            </li>
          )}
          {data!.by_column.map((row) => (
            <li
              key={row.column_id}
              data-testid="time-status-row"
              className="flex min-h-9 items-center gap-2.5 px-3 py-1.5 text-xs"
            >
              <ColorDot color={row.column_color} />
              <span className="min-w-0 flex-1 truncate">{row.column_name}</span>
              <span className="shrink-0 text-muted-foreground">{t("timer.sessions", { count: row.sessions })}</span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums">
                {formatDuration(row.total_seconds, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TimeTab({ ticketId }: TimerSectionProps) {
  const t = useTranslations("ticketsScreen");
  const timer = useTicketTimer(ticketId);
  const snapshot = timer.data;
  const ticking = Boolean(snapshot?.entries.some((e) => e.is_running) || snapshot?.running);
  const now = useNow(ticking);

  return (
    <div data-slot="time-tab" data-testid="time-tab" className="flex flex-col gap-5">
      {timer.isLoading ? (
        <div aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-muted/60" />
      ) : snapshot ? (
        <LoggedTime snapshot={snapshot} now={now} />
      ) : (
        <p className={cn("flex items-center gap-2 text-[13px] text-muted-foreground")}>
          <Clock aria-hidden="true" size={14} />
          {t("timer.loadFailed")}
        </p>
      )}
      <TimeInStatus ticketId={ticketId} />
    </div>
  );
}
