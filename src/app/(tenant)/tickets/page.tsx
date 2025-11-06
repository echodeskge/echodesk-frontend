"use client";

import { useBoard } from "@/contexts/BoardContext";
import TicketsNew from "@/components/TicketsNew";
import { CollaborativeTicketBoard } from "@/components/CollaborativeTicketBoard";

export default function TicketsPage() {
  const { selectedBoardId, setSelectedBoardId } = useBoard();

  // Don't render if no board is selected
  if (!selectedBoardId) {
    return (
      <TicketsNew
        selectedBoardId={selectedBoardId}
        onBoardChange={setSelectedBoardId}
      />
    );
  }

  return (
    <CollaborativeTicketBoard
      boardId={selectedBoardId}
      onTicketUpdate={(ticketId, changes) => {
        console.log('[TicketsPage] Remote ticket update:', ticketId, changes);
        // The TicketsNew component should handle its own state updates
        // You can add custom logic here if needed
      }}
    >
      <TicketsNew
        selectedBoardId={selectedBoardId}
        onBoardChange={setSelectedBoardId}
      />
    </CollaborativeTicketBoard>
  );
}
