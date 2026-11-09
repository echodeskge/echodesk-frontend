"use client";

import { AlertCircle, Calendar, ListChecks } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatShortDate, parseDateOnly } from "../../_lib/format";

export interface DueChipProps {
  /** `due_date` ("YYYY-MM-DD"); parsed as local calendar parts, never via UTC (RM6). */
  date: string | null | undefined;
  /** The server's `is_overdue_task` (E1); the client never decides this itself. */
  overdue: boolean;
  /** Drop the date next to "Overdue" (it stays in the tooltip and the accessible name). */
  compact?: boolean;
  className?: string;
}

/**
 * Due date on cards and rows. Overdue is red **and** shows AlertCircle plus
 * the word "Overdue", so it never relies on colour alone (RM7).
 */
export function DueChip({ date, overdue, compact = false, className }: DueChipProps) {
  const t = useTranslations("ticketsScreen.card");
  const locale = useLocale();
  if (!parseDateOnly(date)) return null;
  const text = formatShortDate(date, locale);
  const dueLabel = t("due", { date: text });
  const label = overdue ? `${t("overdue")} · ${dueLabel}` : dueLabel;
  const Icon = overdue ? AlertCircle : Calendar;
  return (
    <span
      data-slot="due-chip"
      data-overdue={overdue ? "true" : "false"}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-[3px] whitespace-nowrap tabular-nums",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" size={12} />
      {overdue ? (
        <span aria-hidden="true">
          {t("overdue")}
          {!compact && ` · ${text}`}
        </span>
      ) : (
        <span aria-hidden="true">{text}</span>
      )}
    </span>
  );
}

export interface ChecklistCountProps {
  done: number;
  total: number;
  className?: string;
}

/** Checklist progress "n/m" on cards; nothing when the ticket has no checklist (U3). */
export function ChecklistCount({ done, total, className }: ChecklistCountProps) {
  const t = useTranslations("ticketsScreen.card");
  if (!total || total <= 0) return null;
  const complete = done >= total;
  const label = t("checklistLabel", { done, total });
  return (
    <span
      data-slot="checklist-count"
      data-complete={complete ? "true" : "false"}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-[3px] tabular-nums",
        complete ? "text-green" : "text-muted-foreground",
        className,
      )}
    >
      <ListChecks aria-hidden="true" size={12} />
      <span aria-hidden="true">{t("checklist", { done, total })}</span>
    </span>
  );
}
