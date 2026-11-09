"use client";

/**
 * Shared pieces of the properties rail (FE-12):
 *
 * - `useRailPatch(ticket)`: PATCH the ticket with an optional optimistic
 *   change to `tk.ticket(id)`. The shared mutation writes the server response
 *   back and shows the translated error toast; on error the ticket refetches
 *   (E33: no snapshot restore).
 * - `useEditingPresence(ticketId, field)`: `ticket_editing` while a picker is
 *   open, `ticket_editing_stopped` when it closes (E24, WS8).
 * - `RailSection`: the 12px-padded, top-bordered block under the pickers
 *   (customer, forms, payment; D190, D194).
 * - `userName`: display name for a `UserMinimal`.
 */
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SectionLabel } from "../../../_components/primitives/section-label";
import { useTicketsRealtime } from "../../../_contexts/tickets-realtime-context";
import { useTicketMutations } from "../../../_hooks/use-ticket-mutations";
import { tk } from "../../../_lib/query-keys";
import type { TicketDetail, TicketPatch } from "../../../_lib/types";

export function useRailPatch(ticketId: number) {
  const qc = useQueryClient();
  const { patchTicket } = useTicketMutations();
  const mutate = patchTicket.mutate;
  const patch = useCallback(
    (body: TicketPatch, optimistic?: (prev: TicketDetail) => TicketDetail) => {
      if (optimistic) {
        qc.setQueryData<TicketDetail>(tk.ticket(ticketId), (prev) => (prev ? optimistic(prev) : prev));
      }
      mutate(
        { id: ticketId, body },
        {
          onError: () => {
            qc.invalidateQueries({ queryKey: tk.ticket(ticketId) });
          },
        },
      );
    },
    [mutate, qc, ticketId],
  );
  return { patch, pending: patchTicket.isPending };
}

/** Presence while a rail picker is open (E24). Returns an `onOpenChange` wrapper. */
export function useEditingPresence(ticketId: number, field: string) {
  const { sendTicketEditing, sendTicketEditingStopped } = useTicketsRealtime();
  const openRef = useRef(false);
  const stop = useRef(sendTicketEditingStopped);
  stop.current = sendTicketEditingStopped;

  useEffect(
    () => () => {
      if (openRef.current) stop.current(ticketId);
    },
    [ticketId],
  );

  return useCallback(
    (open: boolean) => {
      if (open === openRef.current) return;
      openRef.current = open;
      if (open) sendTicketEditing(ticketId, field);
      else sendTicketEditingStopped(ticketId);
    },
    [field, sendTicketEditing, sendTicketEditingStopped, ticketId],
  );
}

export interface RailSectionProps {
  label: ReactNode;
  /** Right side of the label line (e.g. "Record payment"). */
  action?: ReactNode;
  /** Gap between the children: 10 (customer) or 8 (forms, payment). */
  gap?: 8 | 10;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/** A rail block below the pickers: padding 12, top border, column gap (D190, D194). */
export function RailSection({ label, action, gap = 8, children, className, ...rest }: RailSectionProps) {
  return (
    <section
      data-slot="rail-section"
      data-testid={rest["data-testid"]}
      className={cn("flex flex-col border-t p-3", gap === 10 ? "gap-2.5" : "gap-2", className)}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <SectionLabel as="h3">{label}</SectionLabel>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A row label that never spills into the value column: the 92px column fits
 * "Assignees" but not long single Georgian words ("შემსრულებლები"), which
 * would otherwise overflow under the pills. Truncates with the full text as
 * a tooltip.
 */
export function RailLabel({ children }: { children: string }) {
  return (
    <span className="block truncate" title={children}>
      {children}
    </span>
  );
}

export function userName(u: { first_name?: string | null; last_name?: string | null; email?: string | null; name?: string | null } | null | undefined): string {
  if (!u) return "";
  if (u.name) return u.name;
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return full || u.email || "";
}

/** Trigger classes of a rail picker (mirrors `PropertyPicker`, D179). */
export function railTriggerClass(open: boolean, disabled: boolean) {
  return cn(
    "-ml-1.5 flex min-h-[26px] w-[calc(100%+6px)] flex-wrap items-center gap-1 rounded-md border px-1.5 py-0.5 text-left",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    open ? "border-ring bg-accent" : "border-transparent",
    disabled ? "cursor-default" : "cursor-pointer hover:border-border hover:bg-muted/40",
  );
}
