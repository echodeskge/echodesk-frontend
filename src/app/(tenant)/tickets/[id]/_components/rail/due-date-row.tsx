"use client";

/**
 * Due date row (FE-12, E1, DC35, D185).
 *
 * The value shows through `format.ts` in the app locale ("Nov 12" /
 * "12 ნოე"), never through the browser's date input text, so Georgian
 * dates read the same everywhere. Clicking opens the native picker of a
 * visually hidden `<input type="date">` (`showPicker()`, falling back to
 * focusing the input). Writes `due_date` ("YYYY-MM-DD", parsed as local
 * calendar parts, RM6). A clear button removes it. Overdue (the server's
 * `is_overdue_task`) shows in red with AlertCircle and the word.
 */
import { useRef } from "react";
import { AlertCircle, Calendar, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { formatShortDate, parseDateOnly } from "../../../_lib/format";
import type { TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { useRailPatch, RailLabel } from "./rail-shared";

export function openNativePicker(input: HTMLInputElement | null) {
  if (!input) return;
  const withPicker = input as HTMLInputElement & { showPicker?: () => void };
  try {
    if (typeof withPicker.showPicker === "function") {
      withPicker.showPicker();
      return;
    }
  } catch {
    // Some browsers throw outside a user gesture or for hidden inputs.
  }
  input.focus();
  input.click();
}

export function DueDateRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const locale = useLocale();
  const { patch } = useRailPatch(ticket.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const disabled = !perms.can_edit;
  const value = parseDateOnly(ticket.due_date) ? (ticket.due_date as string) : "";
  const text = value ? formatShortDate(value, locale, { year: "auto" }) : "";
  const overdue = !!value && ticket.is_overdue_task;

  const save = (next: string) => {
    const due = next && parseDateOnly(next) ? next : null;
    if (due === (value || null)) return;
    // The server recomputes is_overdue_task; until then keep the old flag only for the same date.
    patch({ due_date: due }, (prev) => ({ ...prev, due_date: due, is_overdue_task: due ? prev.is_overdue_task && due === prev.due_date : false }));
  };

  const label = value ? (overdue ? t("dueDateOverdue", { date: text }) : text) : t("notSet");

  return (
    <PropertyRow label={<RailLabel>{t("dueDate")}</RailLabel>}>
      <div className="relative -ml-1.5 flex w-[calc(100%+6px)] items-center gap-1" data-testid="due-date-row">
        <button
          type="button"
          disabled={disabled}
          data-slot="due-date-trigger"
          data-overdue={overdue ? "true" : "false"}
          aria-label={`${t("changeDueDate")}: ${label}`}
          onClick={() => openNativePicker(inputRef.current)}
          className={cn(
            "inline-flex h-[26px] min-w-0 items-center gap-1.5 rounded-md border border-transparent px-1.5 text-xs tabular-nums",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !disabled && "cursor-pointer hover:border-border",
            overdue ? "font-medium text-destructive" : value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {overdue ? <AlertCircle aria-hidden="true" size={12} /> : <Calendar aria-hidden="true" size={12} className="text-muted-foreground" />}
          <span className="truncate">{label}</span>
        </button>
        {value && !disabled && (
          <button
            type="button"
            data-testid="due-date-clear"
            aria-label={t("clearDate")}
            title={t("clearDate")}
            onClick={() => save("")}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" size={12} />
          </button>
        )}
        <input
          ref={inputRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="due-date-input"
          disabled={disabled}
          value={value}
          onChange={(e) => save(e.target.value)}
          // Under the trigger so the native picker anchors there; invisible and inert to the pointer.
          className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
        />
      </div>
    </PropertyRow>
  );
}
