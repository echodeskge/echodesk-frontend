import type { ColumnType, TaskType, UserType } from "./types";
import type {
  KanbanBoard,
  TicketColumn,
  TicketList,
  UserMinimal,
} from "@/api/generated/interfaces";

/**
 * Converts a KanbanBoard API payload into the kanban board's internal
 * ColumnType[] shape. Pure (no React/DOM deps) so it can be unit-tested
 * directly and reused without pulling in the drag-and-drop component tree.
 */
export function convertApiDataToKanbanFormat(
  kanbanBoardData: KanbanBoard
): ColumnType[] {
  const columns: ColumnType[] = [];

  // Parse tickets_by_column if it's a string
  const ticketsByColumn =
    typeof kanbanBoardData.tickets_by_column === "string"
      ? JSON.parse(kanbanBoardData.tickets_by_column)
      : kanbanBoardData.tickets_by_column;

  // Convert each column
  kanbanBoardData.columns.forEach((apiColumn: TicketColumn) => {
    const columnTasks: TaskType[] = [];
    const ticketsForColumn = ticketsByColumn[apiColumn.id] || [];

    // Convert tickets to tasks
    ticketsForColumn.forEach((ticket: TicketList) => {
      // assigned_to (primary FK) and assigned_users (M2M) are separate fields
      // on the backend and are NOT kept in sync, so a ticket assigned only via
      // the primary field would otherwise show no avatar. Merge both, deduped
      // by id with the primary assignee first.
      const seen = new Set<number>();
      const mergedUsers: UserMinimal[] = [];
      if (ticket.assigned_to) {
        mergedUsers.push(ticket.assigned_to);
        seen.add(ticket.assigned_to.id);
      }
      ticket.assigned_users?.forEach((user) => {
        if (!seen.has(user.id)) {
          mergedUsers.push(user);
          seen.add(user.id);
        }
      });
      const assignedUsers: UserType[] = mergedUsers.map((user) => ({
        id: user.id.toString(),
        username: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email,
        avatar: undefined,
      }));

      const task: TaskType = {
        id: ticket.id.toString(),
        columnId: apiColumn.id.toString(),
        order: ticket.position_in_column || 0,
        title: ticket.title,
        // Was set to ticket.status (the workflow column name) which
        // shadowed the actual ticket body. Use the real field — backend
        // started returning it on TicketListSerializer in echodesk-back
        // commit 6080ac6.
        description: ticket.description || "",
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
        createdAt: ticket.created_at ? new Date(ticket.created_at) : undefined,
        attachments: [],
      };

      columnTasks.push(task);
    });

    // Sort tasks by position
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

  // Sort columns by position
  columns.sort((a, b) => a.order - b.order);

  return columns;
}
