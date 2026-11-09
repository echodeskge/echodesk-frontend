/** Shared lite-kanban fixtures for the FE-07 board tests. */
import type { KanbanColumn, KanbanResponse, TicketCard } from "@/app/(tenant)/tickets/_lib/types";

export function makeCard(id: number, columnId: number, position: number, overrides: Partial<TicketCard> = {}): TicketCard {
  return {
    id,
    title: `Ticket ${id}`,
    priority: "medium",
    column_id: columnId,
    position_in_column: position,
    is_order: false,
    is_closed: false,
    tags: [],
    assignees: [],
    comments_count: 0,
    attachments_count: 0,
    price: null,
    currency: null,
    is_paid: false,
    payment_due_date: null,
    created_at: "2026-11-05T09:00:00Z",
    updated_at: "2026-11-05T09:00:00Z",
    due_date: null,
    is_overdue_task: false,
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    description_preview: "",
    ...overrides,
  };
}

export function makeColumn(id: number, position: number, overrides: Partial<KanbanColumn> = {}): KanbanColumn {
  return {
    id,
    name: `Column ${id}`,
    color: "#3b82f6",
    position,
    is_default: position === 0,
    is_closed_status: false,
    track_time: false,
    board: 1,
    tickets_count: 0,
    ...overrides,
  };
}

/** Board 1: column 10 = [1, 2, 3], column 20 = [4], column 30 = []. */
export function makeBoard(overrides: Partial<KanbanResponse> = {}): KanbanResponse {
  return {
    board: { id: 1, name: "Support", color: "#3b82f6" },
    columns: [makeColumn(10, 0, { name: "New" }), makeColumn(20, 1, { name: "Doing" }), makeColumn(30, 2, { name: "Done", is_closed_status: true })],
    tickets_by_column: {
      "10": [makeCard(1, 10, 0), makeCard(2, 10, 1), makeCard(3, 10, 2)],
      "20": [makeCard(4, 20, 0)],
      "30": [],
    },
    ...overrides,
  };
}

export function ids(board: KanbanResponse | undefined, columnId: number): number[] {
  return (board?.tickets_by_column[String(columnId)] ?? []).map((c) => c.id);
}

export function positions(board: KanbanResponse | undefined, columnId: number): number[] {
  return (board?.tickets_by_column[String(columnId)] ?? []).map((c) => c.position_in_column);
}
