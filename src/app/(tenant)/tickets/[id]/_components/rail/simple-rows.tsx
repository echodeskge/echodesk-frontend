"use client";

/**
 * Single-value rail rows (FE-12): Status, Priority, Department.
 *
 * - Status: every column of the ticket's board (all pages, shared
 *   `tk.columns`) → `move_to_column` without a position (W77), optimistic
 *   like the status track. Any viewer may move (E4); closed columns are
 *   disabled when `!can_move_to_closed`.
 * - Priority: the four backend values with their colours (E17) → PATCH.
 * - Department: every department plus a translated "None" (W80) → PATCH
 *   `assigned_department_id` (0 clears it: the serializer treats null as
 *   "unchanged").
 */
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PropertyPicker, PropertyPill, type PickerOption } from "../../../_components/primitives/property-picker";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { useTicketMutations } from "../../../_hooks/use-ticket-mutations";
import { useTicketPickers } from "../../../_hooks/use-ticket-pickers";
import { PRIORITY_OPTIONS, getPriorityStyle, type TicketPriority } from "../../../_lib/priority";
import { tk } from "../../../_lib/query-keys";
import type { TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { closedColumnIds, useBoardColumns } from "../status-track-bar";
import { useEditingPresence, useRailPatch } from "./rail-shared";

interface RowProps {
  ticket: TicketDetail;
  perms: ViewerPermissions;
}

export function StatusRow({ ticket, perms }: RowProps) {
  const t = useTranslations("ticketsScreen.rail");
  const qc = useQueryClient();
  const boardId = ticket.board?.id ?? ticket.column?.board ?? null;
  const columns = useBoardColumns(boardId);
  const { moveTicket } = useTicketMutations();
  const presence = useEditingPresence(ticket.id, "status");
  const list = useMemo(() => columns.data ?? [], [columns.data]);
  const closed = useMemo(() => new Set(closedColumnIds(list, perms)), [list, perms]);

  const options: PickerOption<number>[] = useMemo(() => {
    const opts = list.map((c) => ({ value: c.id, label: c.name, color: c.color, disabled: closed.has(c.id) }));
    // The current column is always shown, even before the list arrives.
    if (ticket.column && !opts.some((o) => o.value === ticket.column.id)) {
      opts.unshift({ value: ticket.column.id, label: ticket.column.name, color: ticket.column.color, disabled: false });
    }
    return opts;
  }, [list, closed, ticket.column]);

  const onChange = (columnId: number) => {
    const target = list.find((c) => c.id === columnId);
    if (!target || columnId === ticket.column?.id) return;
    qc.setQueryData<TicketDetail>(tk.ticket(ticket.id), (prev) =>
      prev ? { ...prev, column: { ...prev.column, ...target }, status: target.name } : prev,
    );
    moveTicket.mutate(
      { id: ticket.id, columnId, boardId: boardId ?? undefined },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["ticketNav", ticket.id] });
          qc.invalidateQueries({ queryKey: tk.timeSummary(ticket.id) });
        },
        onError: () => {
          qc.invalidateQueries({ queryKey: tk.ticket(ticket.id) });
        },
      },
    );
  };

  return (
    <PropertyRow label={t("status")}>
      <PropertyPicker
        options={options}
        value={ticket.column?.id ?? null}
        onChange={onChange}
        onOpenChange={presence}
        placeholder={t("notSet")}
        disabled={moveTicket.isPending}
        searchPlaceholder={t("search")}
        emptyText={t("noResults")}
        selectedLabel={t("selected")}
      />
    </PropertyRow>
  );
}

export function PriorityRow({ ticket, perms }: RowProps) {
  const t = useTranslations("ticketsScreen.rail");
  const tTickets = useTranslations("tickets");
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "priority");
  const options: PickerOption<TicketPriority>[] = PRIORITY_OPTIONS.map((p) => {
    const s = getPriorityStyle(p);
    return { value: p, label: tTickets(s.labelKey), textColor: s.color };
  });
  const current = getPriorityStyle(ticket.priority).value;

  return (
    <PropertyRow label={t("priority")}>
      <PropertyPicker
        options={options}
        value={current}
        onChange={(priority) => patch({ priority }, (prev) => ({ ...prev, priority }))}
        onOpenChange={presence}
        placeholder={t("notSet")}
        disabled={!perms.can_edit}
        selectedLabel={t("selected")}
      />
    </PropertyRow>
  );
}

export const NO_DEPARTMENT = 0;

export function DepartmentRow({ ticket, perms }: RowProps) {
  const t = useTranslations("ticketsScreen.rail");
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "department");
  const { departments } = useTicketPickers(ticket.board?.id ?? null, { enabled: perms.can_edit });

  const options: PickerOption<number>[] = useMemo(() => {
    const opts: PickerOption<number>[] = [{ value: NO_DEPARTMENT, label: t("none") }];
    for (const d of departments) opts.push({ value: d.id, label: d.name });
    const cur = ticket.assigned_department;
    if (cur && !opts.some((o) => o.value === cur.id)) opts.push({ value: cur.id, label: cur.name });
    return opts;
  }, [departments, ticket.assigned_department, t]);

  const value = ticket.assigned_department?.id ?? NO_DEPARTMENT;

  return (
    <PropertyRow label={t("department")}>
      <PropertyPicker
        options={options}
        value={value}
        onChange={(id) => {
          const dept = id === NO_DEPARTMENT ? null : departments.find((d) => d.id === id) ?? null;
          patch({ assigned_department_id: id }, (prev) => ({
            ...prev,
            assigned_department: dept ? { id: dept.id, name: dept.name, description: dept.description ?? "" } : null,
          }));
        }}
        onOpenChange={presence}
        placeholder={t("none")}
        disabled={!perms.can_edit}
        searchPlaceholder={t("search")}
        emptyText={t("noResults")}
        selectedLabel={t("selected")}
        renderPill={(o) =>
          o.value === NO_DEPARTMENT ? (
            <span className="text-xs text-muted-foreground">{o.label}</span>
          ) : (
            <PropertyPill label={o.label} />
          )
        }
      />
    </PropertyRow>
  );
}
