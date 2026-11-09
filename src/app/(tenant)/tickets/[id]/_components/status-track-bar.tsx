"use client";

/**
 * The detail status track (plan §3 Detail, DC22, E4): one step per column of
 * the ticket's board (every page of `/columns/`, shared `tk.columns` cache).
 *
 * A click moves the ticket at once in `tk.ticket(id)` (optimistic), then
 * calls `move_to_column`. On error the ticket refetches and the mutation hook
 * shows the translated toast (E33: no snapshot restore).
 *
 * Steps for closed columns are disabled when the server says the viewer
 * can't move there (`!can_move_to_closed`); every other step is enabled for
 * any viewer, because `move_to_column` allows anyone who can see the ticket.
 * All steps are disabled while a move is pending.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { TicketColumn } from "@/api/generated/interfaces";
import { StatusTrack } from "../../_components/primitives/status-track";
import { getAllPages } from "../../_lib/api";
import { tk } from "../../_lib/query-keys";
import { sortColumns } from "../../_hooks/use-ticket-pickers";
import { useTicketMutations } from "../../_hooks/use-ticket-mutations";
import type { TicketDetail, ViewerPermissions } from "../../_lib/types";

export function useBoardColumns(boardId: number | null | undefined) {
  return useQuery<TicketColumn[]>({
    queryKey: tk.columns(boardId ?? 0),
    queryFn: async () => sortColumns(await getAllPages<TicketColumn>("/api/columns/", { board: boardId })),
    enabled: typeof boardId === "number" && boardId > 0,
    staleTime: 5 * 60_000,
  });
}

export function closedColumnIds(columns: Pick<TicketColumn, "id" | "is_closed_status">[], perms: ViewerPermissions): number[] {
  return perms.can_move_to_closed ? [] : columns.filter((c) => c.is_closed_status).map((c) => c.id);
}

export interface StatusTrackBarProps {
  ticket: TicketDetail;
  perms: ViewerPermissions;
}

export function StatusTrackBar({ ticket, perms }: StatusTrackBarProps) {
  const t = useTranslations("ticketsScreen.detail.track");
  const qc = useQueryClient();
  const boardId = ticket.board?.id ?? ticket.column?.board ?? null;
  const columns = useBoardColumns(boardId);
  const { moveTicket } = useTicketMutations();
  const list = useMemo(() => columns.data ?? [], [columns.data]);

  const disabledIds = useMemo(
    () => (moveTicket.isPending ? list.map((c) => c.id) : closedColumnIds(list, perms)),
    [list, perms, moveTicket.isPending],
  );

  if (list.length === 0) {
    // Keep the 41px band so the page doesn't jump when the columns arrive.
    return <div aria-hidden="true" data-slot="status-track-placeholder" className="h-[41px] shrink-0 border-b bg-muted/30" />;
  }

  const onMove = (columnId: number) => {
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
    <StatusTrack
      columns={list.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      currentColumnId={ticket.column?.id}
      onMove={onMove}
      disabledIds={disabledIds}
      labels={{ label: t("label"), moveTo: (title) => t("moveTo", { title }), done: t("done") }}
    />
  );
}
