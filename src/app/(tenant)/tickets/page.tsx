"use client";

import { useMemo } from "react";
import type { KanbanBoard } from "@/api/generated/interfaces";
import { KanbanProvider } from "@/components/kanban-new/kanban-context";
import { Kanban } from "@/components/kanban-new/components/kanban";
import { convertApiDataToKanbanFormat } from "@/components/kanban-new/convert";
import { TicketsScreen, type BoardViewProps } from "./_components/tickets-screen";
import type { KanbanResponse } from "./_lib/types";

/**
 * `/tickets`. The board view is passed in so FE-07's board replaces it with a
 * one-line change at the W1 merge:
 *   <TicketsScreen renderBoard={(p) => <KanbanBoard {...p} />} />
 *
 * Until then `InterimLegacyBoard` feeds the filtered lite payload into the
 * legacy `kanban-new` board, so the toolbar filters, search and the new screen
 * states already work on this branch. FE-15 deletes `kanban-new`.
 */
export default function TicketsPage() {
  return <TicketsScreen renderBoard={(p) => <InterimLegacyBoard {...p} />} />;
}

/** Lite cards in the legacy converter's (non-lite) shape. */
function toLegacyKanban(data: KanbanResponse): KanbanBoard {
  const ticketsByColumn: Record<string, unknown[]> = {};
  for (const [colId, cards] of Object.entries(data.tickets_by_column ?? {})) {
    ticketsByColumn[colId] = (cards ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description_preview ?? "",
      priority: c.priority,
      position_in_column: c.position_in_column,
      created_at: c.created_at,
      tags: c.tags,
      assigned_to: null,
      assigned_users: (c.assignees ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        first_name: u.name,
        last_name: "",
      })),
    }));
  }
  return { ...data, tickets_by_column: ticketsByColumn } as unknown as KanbanBoard;
}

function InterimLegacyBoard({ board, data }: BoardViewProps) {
  const columns = useMemo(() => convertApiDataToKanbanFormat(toLegacyKanban(data)), [data]);
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <KanbanProvider key={board.id} kanbanData={columns} selectedBoard={board} columns={data.columns}>
        <Kanban />
      </KanbanProvider>
    </div>
  );
}
