"use client";

import { useBoard } from "@/contexts/BoardContext";
import { useBoardCollaboration } from "@/contexts/BoardCollaborationContext";
import { useTicketBoardWebSocket } from "@/hooks/useTicketBoardWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import TicketsNew from "@/components/TicketsNew";
import { CollaborativeBadges } from "@/components/CollaborativeBadges";

export default function TicketsPage() {
  const { selectedBoardId, setSelectedBoardId } = useBoard();
  const { boardId } = useBoardCollaboration();
  const queryClient = useQueryClient();

  // Subscribe to WebSocket events for real-time updates
  // The main WebSocket connection is initialized at layout level
  // This subscription handles refetching data when changes occur
  useTicketBoardWebSocket({
    boardId: boardId || 'none',

    // When someone moves a ticket, refetch the kanban board to show the change
    onTicketMoved: (event) => {
      console.log('[TicketsPage] Ticket moved, refetching board:', event);
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },

    // When someone updates ticket fields, refetch the kanban board
    onTicketUpdated: (event) => {
      console.log('[TicketsPage] Ticket updated, refetching board:', event);
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },
  });

  // WebSocket is initialized at layout level
  // Context is provided by layout, so components here can access collaboration state
  return (
    <>
      <TicketsNew
        selectedBoardId={selectedBoardId}
        onBoardChange={setSelectedBoardId}
      />
      {/* Show floating badges for user actions */}
      <CollaborativeBadges />
    </>
  );
}
