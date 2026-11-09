"use client";

/**
 * The rail's fixed "Time" row (plan §3 rail, D186/D189, FE-13):
 * "Mine 1h 20m · Total 3h", live while a timer runs on the ticket.
 *
 * It renders the whole row (label + value) as a fixed `PropertyRow`
 * (grid 92px / 1fr, 9px vertical padding, 12px text, bottom border), so
 * FE-12's PropertiesRail places `<TimeRow ticketId={id} />` among its fixed
 * rows, right before Reporter.
 */
import { useLocale, useTranslations } from "next-intl";
import { formatDuration } from "../../_lib/format";
import { liveTotals, useNow, useTicketTimer } from "../../_hooks/use-ticket-timer";
import { PropertyRow } from "../primitives/property-row";
import type { TimerSectionProps } from "../../[id]/_components/section-contracts";

export function TimeRow({ ticketId }: TimerSectionProps) {
  const t = useTranslations("ticketsScreen");
  const locale = useLocale();
  const timer = useTicketTimer(ticketId);
  const snapshot = timer.data;
  const ticking = Boolean(snapshot?.entries.some((e) => e.is_running) || snapshot?.running);
  // Durations show minutes, so a 15s refresh is plenty.
  const now = useNow(ticking, 15_000);
  const totals = snapshot ? liveTotals(snapshot, now) : null;

  return (
    <PropertyRow fixed label={t("rail.time")}>
      <span data-testid="time-row" data-slot="time-row" className="tabular-nums">
        {totals ? (
          <>
            <span>{t("timer.mine", { time: formatDuration(totals.mine, locale) })}</span>
            <span aria-hidden="true" className="px-1 text-muted-foreground">
              ·
            </span>
            <span className="text-muted-foreground">{t("timer.total", { time: formatDuration(totals.total, locale) })}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
    </PropertyRow>
  );
}
