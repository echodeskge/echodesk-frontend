/**
 * Tests for kanban data conversion logic from TicketsNew.tsx.
 *
 * Tests:
 * - convertApiDataToKanbanFormat: API response -> kanban ColumnType[]
 * - Search filtering on kanban data (title match, description match, no match)
 */

import { describe, it, expect } from "vitest";
import type { KanbanBoard, TicketColumn, TicketList } from "@/api/generated/interfaces";
import type { ColumnType, TaskType } from "@/components/kanban-new/types";

// ---------------------------------------------------------------------------
// Extracted from TicketsNew.tsx (convertApiDataToKanbanFormat)
// ---------------------------------------------------------------------------

function convertApiDataToKanbanFormat(kanbanBoardData: KanbanBoard): ColumnType[] {
  const columns: ColumnType[] = [];

  const ticketsByColumn =
    typeof kanbanBoardData.tickets_by_column === "string"
      ? JSON.parse(kanbanBoardData.tickets_by_column)
      : kanbanBoardData.tickets_by_column;

  kanbanBoardData.columns.forEach((apiColumn: TicketColumn) => {
    const columnTasks: TaskType[] = [];
    const ticketsForColumn = ticketsByColumn[apiColumn.id] || [];

    ticketsForColumn.forEach((ticket: TicketList) => {
      const assignedUsers = ticket.assigned_users?.map((user) => ({
        id: user.id.toString(),
        username: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email,
        avatar: undefined,
      })) || [];

      const task: TaskType = {
        id: ticket.id.toString(),
        columnId: apiColumn.id.toString(),
        order: ticket.position_in_column || 0,
        title: ticket.title,
        description: ticket.status || "",
        label: String(ticket.priority || "low"),
        labels:
          ticket.tags?.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || "#6B7280",
            description: tag.description,
          })) || [],
        comments: [],
        assigned: assignedUsers,
        dueDate: ticket.created_at ? new Date(ticket.created_at) : new Date(),
        attachments: [],
      };

      columnTasks.push(task);
    });

    columnTasks.sort((a, b) => a.order - b.order);

    const column: ColumnType = {
      id: apiColumn.id.toString(),
      order: apiColumn.position || 0,
      title: apiColumn.name,
      color: apiColumn.color,
      tasks: columnTasks,
    };

    columns.push(column);
  });

  columns.sort((a, b) => a.order - b.order);

  return columns;
}

// ---------------------------------------------------------------------------
// Extracted from TicketsNew.tsx (search filter logic)
// ---------------------------------------------------------------------------

function filterKanbanBySearch(kanbanData: ColumnType[], query: string): ColumnType[] {
  if (!query) return kanbanData;
  const lowerQuery = query.toLowerCase();
  return kanbanData.map((col) => ({
    ...col,
    tasks: col.tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
    ),
  }));
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeColumn(overrides: Partial<TicketColumn> = {}): TicketColumn {
  return {
    id: 1,
    name: "To Do",
    position: 0,
    color: "#3498db",
    board: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: "admin",
    tickets_count: 0,
    ...overrides,
  };
}

function makeTicket(overrides: Partial<TicketList> = {}): TicketList {
  return {
    id: 1,
    title: "Test Ticket",
    status: "open",
    priority: "medium" as unknown as TicketList["priority"],
    is_closed: "false",
    column: makeColumn(),
    position_in_column: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: { id: 1, email: "admin@test.com", first_name: "Admin", last_name: "User" } as TicketList["created_by"],
    assigned_to: { id: 2, email: "agent@test.com", first_name: "Agent", last_name: "User" } as TicketList["assigned_to"],
    assigned_users: [],
    assigned_groups: [],
    assignments: [],
    tags: [],
    comments_count: 0,
    ...overrides,
  };
}

function makeKanbanBoard(
  columns: TicketColumn[],
  ticketsByColumn: Record<number, TicketList[]>
): KanbanBoard {
  return {
    columns,
    tickets_by_column: JSON.stringify(ticketsByColumn),
  };
}

// ---------------------------------------------------------------------------
// Tests: convertApiDataToKanbanFormat
// ---------------------------------------------------------------------------

describe("convertApiDataToKanbanFormat", () => {
  it("converts empty board with no columns", () => {
    const board = makeKanbanBoard([], {});
    const result = convertApiDataToKanbanFormat(board);
    expect(result).toEqual([]);
  });

  it("converts single column with no tickets", () => {
    const col = makeColumn({ id: 1, name: "To Do", position: 0 });
    const board = makeKanbanBoard([col], {});
    const result = convertApiDataToKanbanFormat(board);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].title).toBe("To Do");
    expect(result[0].tasks).toEqual([]);
  });

  it("converts column with tickets", () => {
    const col = makeColumn({ id: 1, name: "In Progress", position: 0 });
    const ticket = makeTicket({
      id: 42,
      title: "Fix login bug",
      status: "in_progress",
      priority: "high" as unknown as TicketList["priority"],
      position_in_column: 0,
    });
    const board = makeKanbanBoard([col], { 1: [ticket] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].id).toBe("42");
    expect(result[0].tasks[0].title).toBe("Fix login bug");
    expect(result[0].tasks[0].label).toBe("high");
    expect(result[0].tasks[0].columnId).toBe("1");
  });

  it("sorts columns by position", () => {
    const col1 = makeColumn({ id: 1, name: "Done", position: 2 });
    const col2 = makeColumn({ id: 2, name: "To Do", position: 0 });
    const col3 = makeColumn({ id: 3, name: "In Progress", position: 1 });
    const board = makeKanbanBoard([col1, col2, col3], {});
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].title).toBe("To Do");
    expect(result[1].title).toBe("In Progress");
    expect(result[2].title).toBe("Done");
  });

  it("sorts tasks by position within a column", () => {
    const col = makeColumn({ id: 1 });
    const ticket1 = makeTicket({ id: 1, title: "Third", position_in_column: 2 });
    const ticket2 = makeTicket({ id: 2, title: "First", position_in_column: 0 });
    const ticket3 = makeTicket({ id: 3, title: "Second", position_in_column: 1 });
    const board = makeKanbanBoard([col], { 1: [ticket1, ticket2, ticket3] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks[0].title).toBe("First");
    expect(result[0].tasks[1].title).toBe("Second");
    expect(result[0].tasks[2].title).toBe("Third");
  });

  it("converts assigned_users to UserType format", () => {
    const col = makeColumn({ id: 1 });
    const ticket = makeTicket({
      id: 1,
      assigned_users: [
        { id: 10, email: "john@test.com", first_name: "John", last_name: "Doe" } as TicketList["assigned_users"][0],
      ],
    });
    const board = makeKanbanBoard([col], { 1: [ticket] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks[0].assigned).toHaveLength(1);
    expect(result[0].tasks[0].assigned[0].id).toBe("10");
    expect(result[0].tasks[0].assigned[0].name).toBe("John Doe");
    expect(result[0].tasks[0].assigned[0].username).toBe("john@test.com");
  });

  it("falls back to email when first/last names are empty", () => {
    const col = makeColumn({ id: 1 });
    const ticket = makeTicket({
      id: 1,
      assigned_users: [
        { id: 10, email: "user@test.com", first_name: "", last_name: "" } as TicketList["assigned_users"][0],
      ],
    });
    const board = makeKanbanBoard([col], { 1: [ticket] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks[0].assigned[0].name).toBe("user@test.com");
  });

  it("converts tags to labels format", () => {
    const col = makeColumn({ id: 1 });
    const ticket = makeTicket({
      id: 1,
      tags: [
        { id: 1, name: "bug", color: "#ff0000", description: "Bug reports" } as TicketList["tags"][0],
        { id: 2, name: "feature", color: "" } as TicketList["tags"][0],
      ],
    });
    const board = makeKanbanBoard([col], { 1: [ticket] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks[0].labels).toHaveLength(2);
    expect(result[0].tasks[0].labels![0].name).toBe("bug");
    expect(result[0].tasks[0].labels![0].color).toBe("#ff0000");
    expect(result[0].tasks[0].labels![1].color).toBe("#6B7280"); // fallback color
  });

  it("preserves column color", () => {
    const col = makeColumn({ id: 1, color: "#ff6600" });
    const board = makeKanbanBoard([col], {});
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].color).toBe("#ff6600");
  });

  it("handles tickets_by_column as already-parsed object", () => {
    const col = makeColumn({ id: 1 });
    const ticket = makeTicket({ id: 99, title: "Pre-parsed" });
    // Pass as object rather than JSON string
    const board: KanbanBoard = {
      columns: [col],
      tickets_by_column: { 1: [ticket] } as unknown as string,
    };
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].title).toBe("Pre-parsed");
  });

  it("defaults priority label to 'low' when not set", () => {
    const col = makeColumn({ id: 1 });
    const ticket = makeTicket({ id: 1, priority: undefined as unknown as TicketList["priority"] });
    const board = makeKanbanBoard([col], { 1: [ticket] });
    const result = convertApiDataToKanbanFormat(board);

    expect(result[0].tasks[0].label).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// Tests: Search filtering
// ---------------------------------------------------------------------------

describe("Kanban Search Filtering", () => {
  const columns: ColumnType[] = [
    {
      id: "1",
      order: 0,
      title: "To Do",
      tasks: [
        {
          id: "1",
          columnId: "1",
          order: 0,
          title: "Fix login bug",
          description: "Users cannot sign in with SSO",
          label: "high",
          comments: [],
          assigned: [],
          dueDate: new Date(),
          attachments: [],
        },
        {
          id: "2",
          columnId: "1",
          order: 1,
          title: "Add dark mode",
          description: "Theme support for dashboard",
          label: "medium",
          comments: [],
          assigned: [],
          dueDate: new Date(),
          attachments: [],
        },
      ],
    },
    {
      id: "2",
      order: 1,
      title: "Done",
      tasks: [
        {
          id: "3",
          columnId: "2",
          order: 0,
          title: "Setup CI/CD",
          description: "Pipeline for automated testing",
          label: "low",
          comments: [],
          assigned: [],
          dueDate: new Date(),
          attachments: [],
        },
      ],
    },
  ];

  it("returns all tasks when query is empty", () => {
    const result = filterKanbanBySearch(columns, "");
    expect(result[0].tasks).toHaveLength(2);
    expect(result[1].tasks).toHaveLength(1);
  });

  it("filters tasks by title match", () => {
    const result = filterKanbanBySearch(columns, "login");
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].title).toBe("Fix login bug");
    expect(result[1].tasks).toHaveLength(0);
  });

  it("filters tasks by description match", () => {
    const result = filterKanbanBySearch(columns, "SSO");
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].title).toBe("Fix login bug");
  });

  it("search is case-insensitive", () => {
    const result = filterKanbanBySearch(columns, "DARK MODE");
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].title).toBe("Add dark mode");
  });

  it("returns empty tasks when no match", () => {
    const result = filterKanbanBySearch(columns, "nonexistent query");
    expect(result[0].tasks).toHaveLength(0);
    expect(result[1].tasks).toHaveLength(0);
  });

  it("preserves column structure even when all tasks are filtered out", () => {
    const result = filterKanbanBySearch(columns, "nonexistent");
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("To Do");
    expect(result[1].title).toBe("Done");
  });

  it("matches partial strings", () => {
    const result = filterKanbanBySearch(columns, "CI");
    expect(result[1].tasks).toHaveLength(1);
    expect(result[1].tasks[0].title).toBe("Setup CI/CD");
  });

  it("matches across multiple columns", () => {
    // "a" appears in both "Add dark mode" (To Do) and "automated" (Done description)
    const result = filterKanbanBySearch(columns, "automated");
    expect(result[1].tasks).toHaveLength(1);
  });
});
