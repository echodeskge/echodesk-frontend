"use client"

import { createContext, useReducer, useState, useEffect } from "react"

import type { ReactNode } from "react"
import type {
  ColumnType,
  ColumnWithoutIdAndOrderAndTasksType,
  KanbanContextType,
  TaskType,
  TaskWithoutIdAndOrderAndColumnIdType,
} from "./types"

import { teamMembersData } from "./team-members-data"

import { KanbanReducer } from "./kanban-reducer"
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumn } from "@/hooks/useTicketColumns"
import { useDeleteTicket, useUpdateTicket } from "@/hooks/useTickets"

// Create Kanban context
export const KanbanContext = createContext<KanbanContextType | undefined>(
  undefined
)

interface KanbanProviderProps {
  kanbanData: ColumnType[]
  selectedBoard?: any | null
  apiColumns?: any[]
  children: ReactNode
}

export function KanbanProvider({ kanbanData, selectedBoard = null, apiColumns = [], children }: KanbanProviderProps) {
  // Reducer to manage Kanban state
  const [kanbanState, dispatch] = useReducer(KanbanReducer, {
    columns: kanbanData,
    teamMembers: teamMembersData,
    selectedColumn: undefined,
    selectedTask: undefined,
  })

  // API hooks for column operations - pass boardId for proper cache invalidation
  const boardId = selectedBoard?.id
  const createColumnMutation = useCreateColumn(boardId)
  const updateColumnMutation = useUpdateColumn(boardId)
  const deleteColumnMutation = useDeleteColumn(boardId)
  const reorderColumnMutation = useReorderColumn(boardId)

  // API hooks for ticket operations
  const deleteTicketMutation = useDeleteTicket(boardId)
  const updateTicketMutation = useUpdateTicket(boardId)

  // Sync columns when kanbanData prop changes (after API refetch)
  useEffect(() => {
    dispatch({ type: "syncColumns", columns: kanbanData })
  }, [kanbanData])

  // Sidebar state management
  const [kanbanAddTaskSidebarIsOpen, setKanbanAddTaskSidebarIsOpen] =
    useState(false)
  const [kanbanUpdateTaskSidebarIsOpen, setKanbanUpdateTaskSidebarIsOpen] =
    useState(false)
  const [kanbanAddColumnSidebarIsOpen, setKanbanAddColumnSidebarIsOpen] =
    useState(false)
  const [kanbanUpdateColumnSidebarIsOpen, setKanbanUpdateColumnSidebarIsOpen] =
    useState(false)

  // Handlers for column actions with API integration
  const handleAddColumn = async (column: ColumnWithoutIdAndOrderAndTasksType) => {
    if (!selectedBoard) return

    try {
      await createColumnMutation.mutateAsync({
        name: column.title,
        color: column.color,
        board: selectedBoard.id,
        position: kanbanState.columns.length,
        track_time: column.time_tracking || false,
      } as any)
    } catch (error) {
      console.error('Error adding column:', error)
      throw error
    }
  }

  const handleUpdateColumn = async (column: ColumnType) => {
    // Find the original API column
    const apiColumn = apiColumns.find((c: any) => c.id.toString() === column.id)
    if (!apiColumn) {
      console.error('Column not found in API columns')
      return
    }

    try {
      await updateColumnMutation.mutateAsync({
        id: apiColumn.id,
        data: {
          name: column.title,
          color: column.color,
          track_time: column.time_tracking,
        }
      })
    } catch (error) {
      console.error('Error updating column:', error)
      throw error
    }
  }

  const handleDeleteColumn = async (columnId: ColumnType["id"]) => {
    // Find the original API column
    const apiColumn = apiColumns.find((c: any) => c.id.toString() === columnId)
    if (!apiColumn) {
      console.error('Column not found in API columns')
      return
    }

    try {
      await deleteColumnMutation.mutateAsync(apiColumn.id)
    } catch (error) {
      console.error('Error deleting column:', error)
      throw error
    }
  }

  // Handlers for task actions
  const handleAddTask = (
    task: TaskWithoutIdAndOrderAndColumnIdType,
    columnId: ColumnType["id"]
  ) => {
    dispatch({ type: "addTask", task, columnId })
  }

  const handleUpdateTask = (task: TaskType) => {
    dispatch({ type: "updateTask", task })
  }

  const handleDeleteTask = async (taskId: TaskType["id"]) => {
    try {
      // Convert string ID to number for API call
      const numericId = parseInt(taskId)
      await deleteTicketMutation.mutateAsync(numericId)
    } catch (error) {
      console.error('Error deleting ticket:', error)
      throw error
    }
  }

  // Reorder handlers
  const handleReorderColumns = async (
    sourceIndex: number,
    destinationIndex: number
  ) => {
    if (sourceIndex === destinationIndex) return

    // Optimistic UI update
    dispatch({
      type: "reorderColumns",
      sourceIndex,
      destinationIndex,
    })

    // Get the column that was moved
    const movedColumn = kanbanState.columns[sourceIndex]
    const apiColumn = apiColumns.find((c: any) => c.id.toString() === movedColumn.id)

    if (apiColumn) {
      try {
        // Call API to update position
        await reorderColumnMutation.mutateAsync({
          id: apiColumn.id,
          data: { position: destinationIndex }
        })
      } catch (error) {
        console.error('Error reordering column:', error)
        // Revert on error
        dispatch({
          type: "reorderColumns",
          sourceIndex: destinationIndex,
          destinationIndex: sourceIndex,
        })
      }
    }
  }

  const handleReorderTasks = async (
    sourceColumnId: string,
    sourceIndex: number,
    destinationColumnId: string,
    destinationIndex: number
  ) => {
    if (
      sourceColumnId === destinationColumnId &&
      sourceIndex === destinationIndex
    )
      return

    // Get the source column and task
    const sourceColumn = kanbanState.columns.find(col => col.id === sourceColumnId)
    if (!sourceColumn || !sourceColumn.tasks) return

    const movedTask = sourceColumn.tasks[sourceIndex]
    if (!movedTask) return

    // Find the API column ID for the destination column
    const destinationApiColumn = apiColumns.find((c: any) => c.id.toString() === destinationColumnId)
    if (!destinationApiColumn) {
      console.error('Destination column not found in API columns')
      return
    }

    // Optimistic UI update
    dispatch({
      type: "reorderTasks",
      source: { columnId: sourceColumnId, index: sourceIndex },
      destination: { columnId: destinationColumnId, index: destinationIndex },
    })

    try {
      // Call API to update the ticket's column and position
      await updateTicketMutation.mutateAsync({
        id: parseInt(movedTask.id),
        data: {
          column_id: destinationApiColumn.id,
          position_in_column: destinationIndex,
        }
      })
    } catch (error) {
      console.error('Error reordering task:', error)
      // Revert on error
      dispatch({
        type: "reorderTasks",
        source: { columnId: destinationColumnId, index: destinationIndex },
        destination: { columnId: sourceColumnId, index: sourceIndex },
      })
    }
  }

  // Selection handlers
  const handleSelectColumn = (column: ColumnType | undefined) => {
    dispatch({ type: "selectColumn", column })
  }

  const handleSelectTask = (task: TaskType | undefined) => {
    dispatch({ type: "selectTask", task })
  }

  return (
    <KanbanContext.Provider
      value={{
        kanbanState,
        selectedBoard,
        apiColumns,
        kanbanAddTaskSidebarIsOpen,
        setKanbanAddTaskSidebarIsOpen,
        kanbanUpdateTaskSidebarIsOpen,
        setKanbanUpdateTaskSidebarIsOpen,
        kanbanAddColumnSidebarIsOpen,
        setKanbanAddColumnSidebarIsOpen,
        kanbanUpdateColumnSidebarIsOpen,
        setKanbanUpdateColumnSidebarIsOpen,
        handleAddColumn,
        handleUpdateColumn,
        handleDeleteColumn,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        handleReorderColumns,
        handleReorderTasks,
        handleSelectColumn,
        handleSelectTask,
      }}
    >
      {children}
    </KanbanContext.Provider>
  )
}
