"use client";

import { useBoard } from "@/contexts/BoardContext";
import TicketsNew from "@/components/TicketsNew";

export default function TicketsPage() {
  const { selectedBoardId, setSelectedBoardId } = useBoard();

  return (
    <TicketsNew
      selectedBoardId={selectedBoardId}
      onBoardChange={setSelectedBoardId}
    />
  );
}
