"use client";

import { KanbanBoard } from "./_components/board";
import { TicketList } from "./_components/list";
import { TicketsScreen } from "./_components/tickets-screen";

/**
 * `/tickets`. The screen (FE-06) owns the header bridge, the toolbar and the
 * screen states; the board view is FE-07's `KanbanBoard`, the list view
 * FE-08's `TicketList` (shown while `flags.listViewEnabled`). The board view
 * calls `useKanban(boardId, queryFilters)` and the list `useColumnCounts` with
 * the screen's keys, so react-query shares one request for the toolbar count.
 */
export default function TicketsPage() {
  return (
    <TicketsScreen
      renderBoard={(p) => <KanbanBoard boardId={p.board.id} />}
      renderList={(p) => <TicketList {...p} />}
    />
  );
}
