"use client";

/**
 * "History & transfers" (plan FE-09, A10): the ticket's `/history/` rows,
 * newest first, as translated sentences (`ticketsScreen.activity.events.*`)
 * with the display names the backend stores and Georgian-safe dates
 * (`_lib/format`, never bare Intl). Transfers ("Board A → Board B") are
 * ordinary `transferred` rows.
 */
import { useMemo } from "react";
import { ArrowRightLeft, History as HistoryIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicketHistory } from "../../_hooks/use-ticket";
import { useTicketPickers } from "../../_hooks/use-ticket-pickers";
import { formatDateTime, formatShortDate } from "../../_lib/format";
import { isTicketPriority } from "../../_lib/priority";
import type { HistoryEntry } from "../../_lib/types";
import { resolveHistoryEntry, type EventLookups } from "./activity/activity-format";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Actions with their own sentence under `activity.events`. */
const SENTENCE_ACTIONS: ReadonlySet<string> = new Set([
  "created",
  "status_changed",
  "priority_changed",
  "assigned",
  "unassigned",
  "transferred",
  "due_date_changed",
  "tag_added",
  "tag_removed",
  "attachment_added",
  "attachment_removed",
  "checklist_updated",
  "form_submitted",
]);

/** `activity.fields.*` keys. */
const FIELD_KEYS: ReadonlySet<string> = new Set([
  "title",
  "description",
  "priority",
  "column",
  "assigned_to",
  "due_date",
  "department",
  "customer",
  "price",
  "payment_due_date",
  "is_paid",
]);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export interface HistoryLabels {
  /** `ticketsScreen.activity` translator. */
  t: Translate;
  /** `tickets` translator (priority names). */
  tTickets: Translate;
  locale: string;
}

export function historyUserName(entry: Pick<HistoryEntry, "user">, t: Translate): string {
  const u = entry.user as (HistoryEntry["user"] & { full_name?: string }) | null;
  if (!u) return t("system");
  const full = u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return full || u.email || t("deletedUser");
}

function valueLabel(raw: string | null | undefined, field: string | null | undefined, l: HistoryLabels): string {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  if (field === "priority" && isTicketPriority(v)) return l.tTickets(`priority.${v}`);
  if (DATE_ONLY.test(v)) return formatShortDate(v, l.locale, { year: "auto" });
  return v;
}

/** One history row as a translated sentence. */
export function historySentence(entry: HistoryEntry, l: HistoryLabels): string {
  const { t } = l;
  const name = historyUserName(entry, t);
  const field = entry.field_name || "";
  const old = valueLabel(entry.old_value, field, l);
  const neu = valueLabel(entry.new_value, field, l);
  const target = (entry.new_value || entry.old_value || "").trim() || "—";

  if (entry.action === "updated" && field === "customer") return t("events.customer", { name, new: neu });
  if (SENTENCE_ACTIONS.has(entry.action)) {
    return t(`events.${entry.action}`, { name, old, new: neu, target });
  }
  if (entry.action === "updated") {
    const fieldLabel = t(`fields.${FIELD_KEYS.has(field) ? field : "other"}`);
    if (entry.old_value || entry.new_value) return t("events.updated", { name, field: fieldLabel, old, new: neu });
    return t("events.updatedNoValue", { name, field: fieldLabel });
  }
  if (entry.action === "comment_added") return t("events.commented", { name });
  return t("events.other", { name });
}

export interface HistoryDialogProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The ticket's board: names the column / assignee / department ids in the rows. */
  boardId?: number | null;
}

export function HistoryDialog({ ticketId, open, onOpenChange, boardId }: HistoryDialogProps) {
  const t = useTranslations("ticketsScreen.activity");
  const tHistory = useTranslations("ticketsScreen.history");
  const tTickets = useTranslations("tickets");
  const locale = useLocale();
  const history = useTicketHistory(ticketId, { enabled: open });
  // Status / assignee / department rows store ids: name them like the feed does.
  const pickers = useTicketPickers(boardId ?? null, { enabled: open && !!boardId });
  const lookups = useMemo<EventLookups>(() => {
    const users = new Map<string, string>();
    for (const u of pickers.users) {
      users.set(String(u.id), u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email);
    }
    return {
      columns: new Map(pickers.columns.map((c) => [String(c.id), c.name])),
      users,
      departments: new Map(pickers.departments.map((d) => [String(d.id), d.name])),
    };
  }, [pickers.columns, pickers.users, pickers.departments]);

  const rows = useMemo(
    () =>
      [...(history.data ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id,
      ),
    [history.data],
  );
  const labels: HistoryLabels = { t: t as unknown as Translate, tTickets: tTickets as unknown as Translate, locale };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="history-dialog" className="flex max-h-[min(80vh,640px)] flex-col gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-[15px]">{tHistory("title")}</DialogTitle>
          <DialogDescription className="sr-only">{tHistory("title")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {history.isLoading ? (
            <div className="flex flex-col gap-3 py-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">{tHistory("empty")}</p>
          ) : (
            <ol className="flex flex-col">
              {rows.map((entry) => {
                const Icon = entry.action === "transferred" ? ArrowRightLeft : HistoryIcon;
                return (
                  <li
                    key={entry.id}
                    data-action={entry.action}
                    className="flex items-start gap-2.5 border-b py-2 text-[13px] leading-5 last:border-b-0"
                  >
                    <Icon aria-hidden="true" size={14} className="mt-[3px] shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 break-words">{historySentence(resolveHistoryEntry(entry, lookups), labels)}</span>
                    <time
                      dateTime={entry.created_at}
                      className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                    >
                      {formatDateTime(entry.created_at, locale)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
