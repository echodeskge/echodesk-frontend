"use client";

import { useState } from "react";
import TicketList from "./TicketList";
import TicketDetail from "./TicketDetail";
import TicketForm from "./TicketForm";
import KanbanBoard from "./KanbanBoard";
import BoardForm from "./BoardForm";
import type { Ticket, Board } from "@/api/generated/interfaces";

type View = "list" | "kanban" | "detail" | "create" | "edit" | "createBoard";

interface TicketManagementProps {}

export default function TicketManagement({}: TicketManagementProps = {}) {
  const [currentView, setCurrentView] = useState<View>("kanban");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleTicketSelect = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setCurrentView("detail");
  };

  const handleCreateTicket = () => {
    setSelectedTicket(null);
    setCurrentView("create");
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView("edit");
  };

  const handleBackToList = () => {
    setCurrentView("kanban");
    setSelectedTicketId(null);
    setSelectedTicket(null);
  };

  const handleCreateBoard = () => {
    setCurrentView("createBoard");
  };

  const handleBoardCreated = (board: Board) => {
    // After creating board, go back to kanban view
    setCurrentView("kanban");
  };

  const handleTicketSaved = (ticket: Ticket) => {
    // After saving, show the ticket detail
    setSelectedTicketId(ticket.id);
    setSelectedTicket(ticket);
    setCurrentView("detail");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "list":
        return (
          <TicketList
            onTicketSelect={handleTicketSelect}
            onCreateTicket={handleCreateTicket}
          />
        );

      case "kanban":
        return (
          <KanbanBoard
            onTicketClick={handleTicketSelect}
            onCreateTicket={handleCreateTicket}
            onCreateBoard={handleCreateBoard}
          />
        );

      case "detail":
        if (!selectedTicketId) {
          return <div>No ticket selected</div>;
        }
        return (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToList}
            onEdit={handleEditTicket}
          />
        );

      case "create":
        return (
          <TicketForm onSave={handleTicketSaved} onCancel={handleBackToList} />
        );

      case "edit":
        if (!selectedTicket) {
          return <div>No ticket selected for editing</div>;
        }
        return (
          <TicketForm
            ticket={selectedTicket}
            onSave={handleTicketSaved}
            onCancel={() => setCurrentView("detail")}
          />
        );

      case "createBoard":
        return (
          <BoardForm
            onSave={handleBoardCreated}
            onCancel={handleBackToList}
          />
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div
      style={{
        background: "#f8f9fa",
      }}
    >
      {/* Header with view toggle buttons */}
      <div style={{ padding: "20px 20px 0 20px" }}>
        {/* View Toggle Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCurrentView("kanban")}
              style={{
                background:
                  currentView === "kanban" ? "#007bff" : "transparent",
                color: currentView === "kanban" ? "white" : "#007bff",
                border: "1px solid #007bff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              📋 Kanban
            </button>
            <button
              onClick={() => setCurrentView("list")}
              style={{
                background: currentView === "list" ? "#007bff" : "transparent",
                color: currentView === "list" ? "white" : "#007bff",
                border: "1px solid #007bff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              📋 List
            </button>
          </div>
        </div>

      {renderCurrentView()}
    </div>
  );
}
