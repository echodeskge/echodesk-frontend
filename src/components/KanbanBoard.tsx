"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { kanbanBoard, boardsList, boardsKanbanBoardRetrieve } from "@/api/generated/api";
import axios from "@/api/axios";
import { useBoards } from "@/hooks/useBoards";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import BoardSwitcher from "@/components/BoardSwitcher";
import BoardStatusEditor from "@/components/BoardStatusEditor";
import BoardUserManager from "@/components/BoardUserManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Clock, User, Tag } from "lucide-react";
import type {
  Ticket,
  TicketList,
  TicketColumn,
  KanbanBoard as KanbanBoardType,
  Board,
} from "@/api/generated/interfaces";

interface KanbanBoardProps {
  onTicketClick?: (ticketId: number) => void;
  onCreateTicket?: () => void;
  onCreateBoard?: () => void;
}

interface KanbanBoardContentProps extends KanbanBoardProps {
  onEditBoardStatuses?: (boardId: number) => void;
  onManageBoardUsers?: (boardId: number) => void;
}

type TicketStatus = string;

interface DragItem {
  type: string;
  id: number;
  columnId: number;
  index: number;
}

// Helper functions
const getPriorityColor = (priority?: any) => {
  if (!priority) return "#6c757d";
  const priorityStr = String(priority).toLowerCase();
  switch (priorityStr) {
    case "high":
      return "#dc3545";
    case "medium":
      return "#fd7e14";
    case "low":
      return "#28a745";
    default:
      return "#6c757d";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Draggable Ticket Component
function DraggableTicket({
  ticket,
  index,
  column,
  onTicketClick,
  onMoveTicket,
}: {
  ticket: TicketList;
  index: number;
  column: TicketColumn;
  onTicketClick?: (ticketId: number) => void;
  onMoveTicket: (
    ticketId: number,
    sourceColumnId: number,
    destColumnId: number,
    sourceIndex: number,
    destIndex: number
  ) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag({
    type: "ticket",
    item: (): DragItem => ({
      type: "ticket",
      id: ticket.id,
      columnId: column.id,
      index,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: "ticket",
    hover: (item: DragItem, monitor) => {
      if (
        !item ||
        item.id === ticket.id ||
        !ref.current ||
        !monitor.isOver({ shallow: true })
      ) {
        return;
      }

      const dragColumnId = item.columnId;
      const hoverColumnId = column.id;
      const dragIndex = item.index;
      const hoverIndex = index;

      // If dragging to same column and same position, do nothing
      if (dragColumnId === hoverColumnId && dragIndex === hoverIndex) {
        return;
      }

      // Get the hovered rectangle
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) {
        return;
      }

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Move the item
      onMoveTicket(item.id, dragColumnId, hoverColumnId, dragIndex, hoverIndex);

      // Update the item for continued dragging
      item.index = hoverIndex;
    },
  });

  // Connect drag and drop to the element
  dragRef(dropRef(ref));

  return (
    <Card
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onTicketClick?.(ticket.id);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className={`
        mb-2 cursor-pointer transition-all duration-200 shadow-none border-gray-200
        ${isDragging ? 'opacity-50 shadow-lg cursor-grabbing' : 'hover:shadow-md cursor-grab'}
        ${isDragging ? 'border-2' : 'border'}
      `}
      style={{
        borderColor: isDragging ? (column.color || "#007bff") : undefined,
        backgroundColor: isDragging ? "#f8f9fa" : undefined,
        userSelect: 'none',
      }}
    >
      <CardContent className="p-3">
        {/* Ticket Priority Indicator */}
        <div
          className="w-full h-1 rounded-sm mb-2"
          style={{ backgroundColor: getPriorityColor(ticket.priority) }}
        />

        {/* Ticket Title */}
        <h4 className="text-sm font-semibold mb-2 text-gray-900 leading-tight">
          {ticket.title}
        </h4>

        {/* Ticket Meta */}
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <span>#{ticket.id}</span>
          <span>{formatDate(ticket.created_at)}</span>
        </div>

        {/* Assigned User */}
        {ticket.assigned_to && (
          <div className="flex items-center gap-1 mb-2 text-xs text-gray-700">
            <User className="h-3 w-3" />
            <span>{ticket.assigned_to.first_name} {ticket.assigned_to.last_name}</span>
          </div>
        )}

        {/* Progress indicators */}
        <div className="flex items-center gap-2 mb-2">
          {/* Comments count */}
          {ticket.comments_count && Number(ticket.comments_count) > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              💬 {ticket.comments_count}
            </Badge>
          )}

          {/* Time tracking indicator */}
          {column.track_time && (
            <Badge variant="outline" className="text-xs px-1 py-0 text-blue-600 border-blue-200">
              <Clock className="h-3 w-3 mr-1" />
              Tracking
            </Badge>
          )}
        </div>

        {/* Tags */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.tags.slice(0, 3).map((tag: any) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-0"
              >
                <Tag className="h-2 w-2 mr-1" />
                {tag.name}
              </Badge>
            ))}
            {ticket.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{ticket.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Droppable Column Component
function DroppableColumn({
  column,
  tickets,
  onTicketClick,
  onMoveTicket,
  columnWidth,
}: {
  column: TicketColumn;
  tickets: TicketList[];
  onTicketClick?: (ticketId: number) => void;
  onMoveTicket: (
    ticketId: number,
    sourceColumnId: number,
    destColumnId: number,
    sourceIndex: number,
    destIndex: number
  ) => void;
  columnWidth: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ticket",
    drop: (item: DragItem, monitor) => {
      if (monitor.didDrop()) {
        return; // Ignore if already handled by a ticket
      }

      const sourceColumnId = item.columnId;
      const destColumnId = column.id;
      const sourceIndex = item.index;
      const destIndex = tickets.length; // Add to end when dropping on column

      if (sourceColumnId !== destColumnId) {
        onMoveTicket(
          item.id,
          sourceColumnId,
          destColumnId,
          sourceIndex,
          destIndex
        );
        // Update item for continued interactions
        item.columnId = destColumnId;
        item.index = destIndex;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Connect drop to the element
  dropRef(ref);

  return (
    <Card
      ref={ref}
      className={`
        kanban-column flex-shrink-0 transition-all duration-200 shadow-none h-full flex flex-col
        ${isOver ? 'border-2 border-dashed shadow-md' : 'border border-gray-200'}
      `}
      style={{
        minWidth: Math.max(280, parseInt(columnWidth)), // Ensure minimum readable width
        maxWidth: columnWidth,
        width: "100%",
        backgroundColor: isOver
          ? `${column.color || "#6c757d"}15`
          : undefined,
        borderColor: isOver
          ? column.color || "#6c757d"
          : undefined,
        cursor: 'default',
        userSelect: 'none',
      }}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
    >
      <CardHeader className="pb-3" draggable={false} onDragStart={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between" draggable={false}>
          <div className="flex items-center gap-2" draggable={false}>
            <div
              className="w-4 h-4 rounded shadow-sm"
              style={{
                backgroundColor: column.color || "#6c757d",
                boxShadow: `0 2px 4px ${column.color || "#6c757d"}25`,
              }}
              draggable={false}
            />
            <CardTitle
              className="text-sm font-semibold"
              style={{ color: column.color || "#333" }}
              draggable={false}
            >
              {column.name}
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${column.color || "#6c757d"}20`,
              color: column.color || "#495057",
            }}
            draggable={false}
          >
            {tickets.length}
          </Badge>
        </div>

        {/* Column Description */}
        {column.description && (
          <p className="text-xs text-muted-foreground mt-2 mb-0" draggable={false}>
            {column.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 flex-1 overflow-hidden">
        {/* Tickets */}
        <div className="h-full overflow-y-auto space-y-2 pr-2">
          {tickets.map((ticket, index) => (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              index={index}
              column={column}
              onTicketClick={onTicketClick}
              onMoveTicket={onMoveTicket}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Kanban Board Component
function KanbanBoardContent({
  onTicketClick,
  onCreateTicket,
  onCreateBoard,
  onEditBoardStatuses,
  onManageBoardUsers,
}: KanbanBoardContentProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Use React Query hooks for data fetching
  const { data: boards = [], isLoading: boardsLoading, error: boardsError } = useBoards();
  const { data: boardData, isLoading: boardDataLoading, error: boardDataError, refetch: refetchBoardData } = useKanbanBoard(selectedBoardId);

  const loading = boardsLoading || boardDataLoading;

  // Calculate column dimensions based on available space
  const calculateColumnDimensions = (numColumns: number) => {
    const isMobile = windowWidth < 768;
    // On mobile, sidebar is fixed and doesn't take space; on desktop it does
    const sidebarWidth = isMobile ? 0 : 260;
    const containerPadding = 40; // 20px padding on each side of main content
    const availableWidth = windowWidth - sidebarWidth - containerPadding;
    
    // Account for gaps between columns (16px gap)
    const gapWidth = Math.max(0, (numColumns - 1) * 16);
    const totalAvailableWidth = availableWidth - gapWidth;
    
    // Calculate column width with 150px minimum
    const minColumnWidth = 150;
    const idealColumnWidth = Math.floor(totalAvailableWidth / numColumns);
    
    const needsHorizontalScroll = idealColumnWidth < minColumnWidth;
    const columnWidth = needsHorizontalScroll ? minColumnWidth : idealColumnWidth;
    
    return {
      columnWidth,
      needsHorizontalScroll,
      availableWidth,
      totalAvailableWidth
    };
  };

  // Set selected board when boards are loaded
  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) {
      const defaultBoard = boards.find(board => board.is_default) || boards[0];
      if (defaultBoard) {
        setSelectedBoardId(defaultBoard.id);
      }
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle errors from React Query
  useEffect(() => {
    if (boardsError) {
      setError("Failed to load boards");
    } else if (boardDataError) {
      setError("Failed to load kanban board");
    } else if (boards.length === 0 && !boardsLoading) {
      setError("No boards found. Please create a board first.");
    } else {
      setError("");
    }
  }, [boardsError, boardDataError, boards.length, boardsLoading]);

  const moveTicket = useCallback(
    async (
      ticketId: number,
      sourceColumnId: number,
      destColumnId: number,
      sourceIndex: number,
      destIndex: number
    ) => {
      // Prevent moves during API calls
      if (isMoving) {
        return;
      }

      // Only make API call if moving between different columns
      if (sourceColumnId !== destColumnId) {
        setIsMoving(true);

        try {
          // Use the move_to_column endpoint to trigger time tracking
          await axios.patch(`/api/tickets/${ticketId}/move_to_column/`, {
            column_id: destColumnId,
            position_in_column: destIndex,
          });

          // Refresh the board data to get the updated state
          if (selectedBoardId) {
            await refetchBoardData();
          }
        } catch (err: unknown) {
          console.error("Failed to move ticket:", err);
          setError("Failed to move ticket. Please try again.");

          // Clear error after 3 seconds
          setTimeout(() => setError(""), 3000);
        } finally {
          setIsMoving(false);
        }
      } else {
        // Same column, no API call needed - would need reorder endpoint
      }
    },
    [isMoving, selectedBoardId]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Spinner className="h-8 w-8" />
            <span className="text-muted-foreground">Loading kanban board...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg">
            <p className="mb-4">{error}</p>
            <Button
              onClick={() => refetchBoardData()}
              variant="destructive"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!boardData && !loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No board data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {error && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#dc3545",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(220,53,69,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "300px",
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0",
              marginLeft: "8px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-4 px-4 md:px-6 pt-4 md:pt-6 flex-shrink-0">
        <div className="flex flex-col gap-3 flex-1">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 m-0">
            Kanban Board
          </h2>
          <BoardSwitcher
            selectedBoardId={selectedBoardId}
            boards={boards}
            onBoardChange={setSelectedBoardId}
            onCreateBoard={onCreateBoard}
            onEditBoardStatuses={onEditBoardStatuses}
            onManageBoardUsers={onManageBoardUsers}
          />
        </div>
        {onCreateTicket && (
          <Button
            onClick={onCreateTicket}
            className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="create-ticket-text">Create Ticket</span>
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isMoving && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid #007bff",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            Moving ticket...
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 px-4 md:px-6 pb-4 md:pb-6 overflow-hidden">
        <div
          className="kanban-container h-full flex gap-4 overflow-x-auto overflow-y-hidden pb-4"
          style={{
            scrollbarWidth: "thin", // For Firefox
          }}
        >
        {boardData &&
          boardData.columns?.map((column) => {
            // Get tickets for this column from tickets_by_column
            const ticketsByColumn = boardData.tickets_by_column as any;
            const columnTickets = ticketsByColumn?.[column.id] || [];
            
            // Calculate column width using the shared function
            const numColumns = boardData.columns?.length || 1;
            const { columnWidth: calculatedWidth } = calculateColumnDimensions(numColumns);
            const columnWidth = calculatedWidth + 'px';

            return (
              <DroppableColumn
                key={column.id}
                column={column}
                tickets={columnTickets}
                onTicketClick={onTicketClick}
                onMoveTicket={moveTicket}
                columnWidth={columnWidth}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        .kanban-container {
          /* Smooth scrolling */
          scroll-behavior: smooth;
        }
        
        .kanban-container::-webkit-scrollbar {
          height: 8px;
        }
        
        .kanban-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .kanban-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .kanban-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        @media (max-width: 600px) {
          .create-ticket-text {
            display: none !important;
          }
        }
        
        @media (max-width: 768px) {
          .kanban-container {
            overflow-x: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

// Wrapper component with DndProvider
export default function KanbanBoard({
  onTicketClick,
  onCreateTicket,
  onCreateBoard,
}: KanbanBoardProps) {
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [managingBoardUsersId, setManagingBoardUsersId] = useState<number | null>(null);

  const handleEditBoardStatuses = (boardId: number) => {
    setEditingBoardId(boardId);
  };

  const handleManageBoardUsers = (boardId: number) => {
    setManagingBoardUsersId(boardId);
  };

  const handleCloseEditor = () => {
    setEditingBoardId(null);
  };

  const handleCloseUserManager = () => {
    setManagingBoardUsersId(null);
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <KanbanBoardContent
          onTicketClick={onTicketClick}
          onCreateTicket={onCreateTicket}
          onCreateBoard={onCreateBoard}
          onEditBoardStatuses={handleEditBoardStatuses}
          onManageBoardUsers={handleManageBoardUsers}
        />
      </DndProvider>
      
      <BoardStatusEditor
        boardId={editingBoardId}
        open={editingBoardId !== null}
        onClose={handleCloseEditor}
      />

      <BoardUserManager
        boardId={managingBoardUsersId}
        open={managingBoardUsersId !== null}
        onClose={handleCloseUserManager}
      />
    </>
  );
}
