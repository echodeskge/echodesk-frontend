"use client";

import { useState, useEffect } from "react";
import { boardsList } from "@/api/generated/api";
import type { Board } from "@/api/generated/interfaces";

interface BoardSwitcherProps {
  selectedBoardId: number | null;
  onBoardChange: (boardId: number) => void;
  onCreateBoard?: () => void;
}

export default function BoardSwitcher({
  selectedBoardId,
  onBoardChange,
  onCreateBoard,
}: BoardSwitcherProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await boardsList();
      setBoards(response.results || []);
    } catch (error) {
      console.error("Failed to fetch boards:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedBoard = boards.find(board => board.id === selectedBoardId);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "6px",
          padding: "8px 12px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          minWidth: "200px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: selectedBoard?.is_default ? "#007bff" : "#28a745",
            }}
          />
          <span>
            {loading ? "Loading..." : selectedBoard?.name || "Select Board"}
          </span>
        </div>
        <span
          style={{
            transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 1000,
              marginTop: "4px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {boards.map((board) => (
              <div
                key={board.id}
                onClick={() => {
                  onBoardChange(board.id);
                  setShowDropdown(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: selectedBoardId === board.id ? "#e7f3ff" : "transparent",
                  borderBottom: "1px solid #f1f3f4",
                }}
                onMouseEnter={(e) => {
                  if (selectedBoardId !== board.id) {
                    (e.target as HTMLElement).style.background = "#f8f9fa";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedBoardId !== board.id) {
                    (e.target as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: board.is_default ? "#007bff" : "#28a745",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "500", fontSize: "14px" }}>
                    {board.name}
                  </div>
                  {board.description && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6c757d",
                        marginTop: "2px",
                      }}
                    >
                      {board.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6c757d",
                    background: "#f8f9fa",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {board.columns_count} columns
                </div>
              </div>
            ))}

            {onCreateBoard && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "#dee2e6",
                    margin: "4px 0",
                  }}
                />
                <div
                  onClick={() => {
                    onCreateBoard();
                    setShowDropdown(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    color: "#007bff",
                    fontWeight: "500",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "16px" }}>+</span>
                  <span>Create New Board</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}