"use client";

import { useState } from "react";
import TicketList from "./TicketList";
import TicketDetail from "./TicketDetail";
import TicketForm from "./TicketForm";
import KanbanBoard from "./KanbanBoard";
import type { Ticket } from "@/api/generated/interfaces";

type View = "list" | "kanban" | "detail" | "create" | "edit";

interface TicketManagementProps {
  onBackToDashboard?: () => void;
}

export default function TicketManagement({
  onBackToDashboard,
}: TicketManagementProps) {
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

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
      }}
    >
      {/* Header with back button */}
      {onBackToDashboard && (
        <div>
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
      )}

      {renderCurrentView()}
    </div>
  );
}
