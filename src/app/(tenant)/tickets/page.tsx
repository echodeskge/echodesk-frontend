"use client";

import { useBoard } from "@/contexts/BoardContext";
import TicketsNew from "@/components/TicketsNew";
import { CollaborativeBadges } from "@/components/CollaborativeBadges";

export default function TicketsPage() {
  const { selectedBoardId, setSelectedBoardId } = useBoard();

  // WebSocket is initialized at layout level with all event handlers
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
