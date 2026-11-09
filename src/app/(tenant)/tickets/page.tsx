"use client";

import { KanbanBoard } from "./_components/board";
import { TicketsScreen } from "./_components/tickets-screen";

/**
 * `/tickets`. The screen (FE-06) owns the header bridge, the toolbar and the
 * screen states; the board view is FE-07's `KanbanBoard`. Both call
 * `useKanban(boardId, queryFilters)` with the same key, so react-query shares
 * one request. FE-08 adds `renderList` in W2.
 */
export default function TicketsPage() {
  return <TicketsScreen renderBoard={(p) => <KanbanBoard boardId={p.board.id} />} />;
}
