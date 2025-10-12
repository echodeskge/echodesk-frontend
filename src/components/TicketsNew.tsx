"use client";

import { useState, useEffect, useMemo } from "react";
import { useBoards } from "@/hooks/useBoards";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import { KanbanProvider } from "./kanban-new/kanban-context";
import { Kanban } from "./kanban-new/components/kanban";
import { Spinner } from "@/components/ui/spinner";
import type { ColumnType, TaskType, UserType } from "./kanban-new/types";
import type { KanbanBoard, TicketList, TicketColumn } from "@/api/generated/interfaces";

// Helper to convert API data to Kanban format
function convertApiDataToKanbanFormat(kanbanBoardData: KanbanBoard): ColumnType[] {
  const columns: ColumnType[] = [];

  // Parse tickets_by_column if it's a string
  const ticketsByColumn = typeof kanbanBoardData.tickets_by_column === 'string'
    ? JSON.parse(kanbanBoardData.tickets_by_column)
    : kanbanBoardData.tickets_by_column;

  // Convert each column
  kanbanBoardData.columns.forEach((apiColumn: TicketColumn) => {
    const columnTasks: TaskType[] = [];
    const ticketsForColumn = ticketsByColumn[apiColumn.id] || [];

    // Convert tickets to tasks
    ticketsForColumn.forEach((ticket: TicketList) => {
      const assignedUsers: UserType[] = ticket.assigned_users?.map(user => ({
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
        description: ticket.status || '',
        label: String(ticket.priority || 'low'),
        comments: [],
        assigned: assignedUsers,
        dueDate: ticket.created_at ? new Date(ticket.created_at) : new Date(),
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

interface TicketsNewProps {
  selectedBoardId: number | null;
  onBoardChange: (boardId: number) => void;
}

export default function TicketsNew({ selectedBoardId, onBoardChange }: TicketsNewProps) {
  const { data: boards, isLoading: boardsLoading } = useBoards();
  const { data: kanbanBoardData, isLoading: kanbanLoading, error: kanbanError } = useKanbanBoard(selectedBoardId);

  // Set initial board when boards load
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      // Try to find default board, otherwise use first board
      const defaultBoard = boards.find(b => b.is_default);
      onBoardChange(defaultBoard?.id || boards[0].id);
    }
  }, [boards, selectedBoardId, onBoardChange]);

  // Convert API data to kanban format
  const kanbanData = useMemo(() => {
    if (!kanbanBoardData) return [];
    return convertApiDataToKanbanFormat(kanbanBoardData);
  }, [kanbanBoardData]);

  if (boardsLoading || (selectedBoardId && kanbanLoading)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  if (kanbanError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-destructive">Error loading kanban board</p>
          <p className="text-xs text-muted-foreground">
            {kanbanError instanceof Error ? kanbanError.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">No boards available</p>
          <p className="text-xs text-muted-foreground">Create a board to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <KanbanProvider kanbanData={kanbanData}>
        <Kanban />
      </KanbanProvider>
    </div>
  );
}
