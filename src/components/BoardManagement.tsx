"use client";

import { useState, useEffect } from "react";
import { Board, User } from "@/api/generated/interfaces";
import { boardsList, boardsPartialUpdate } from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";

interface BoardManagementProps {}

export default function BoardManagement({}: BoardManagementProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [orderUserIds, setOrderUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      // Convert order_users to assignment data format for the MultiUserAssignment component
      const assignments = (selectedBoard.order_users || []).map(user => ({
        userId: user.id,
        role: 'collaborator' as const
      }));
      setOrderUserIds(assignments.map(a => a.userId));
    }
  }, [selectedBoard]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boardsResult, usersResult] = await Promise.all([
        boardsList(),
        ticketService.getUsers()
      ]);
      
      setBoards(boardsResult.results || []);
      setUsers(usersResult.results || []);
      
      // Auto-select first board
      if (boardsResult.results && boardsResult.results.length > 0) {
        setSelectedBoard(boardsResult.results[0]);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load boards and users");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUsersChange = (assignments: AssignmentData[]) => {
    const userIds = assignments.map(assignment => assignment.userId);
    setOrderUserIds(userIds);
  };

  const handleSaveOrderUsers = async () => {
    if (!selectedBoard) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await boardsPartialUpdate(selectedBoard.id, {
        order_user_ids: orderUserIds
      });

      setSuccess("Order users updated successfully!");
      
      // Refresh the board data
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("Failed to update order users:", err);
      setError(err.response?.data?.detail || "Failed to update order users");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div style={{ color: "#6c757d" }}>Loading boards...</div>
        </div>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "40px",
        textAlign: "center",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.6 }}>📋</div>
        <h2 style={{ color: "#343a40", marginBottom: "8px" }}>No Boards Available</h2>
        <p style={{ color: "#6c757d", marginBottom: "0" }}>
          Create a board first to manage order users.
        </p>
      </div>
    );
  }

  const currentOrderAssignments: AssignmentData[] = orderUserIds.map(userId => ({
    userId,
    role: 'collaborator' as const
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}>
        <h1 style={{ 
          margin: "0 0 8px 0", 
          color: "#343a40",
          fontSize: "24px",
          fontWeight: "600"
        }}>
          📋 Board Management
        </h1>
        <p style={{ 
          margin: 0, 
          color: "#6c757d",
          fontSize: "14px" 
        }}>
          Configure which users can create orders on each board
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
        {/* Board Selection */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#343a40", fontSize: "18px" }}>
            Select Board
          </h3>
          
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => setSelectedBoard(board)}
              style={{
                padding: "12px",
                border: selectedBoard?.id === board.id ? "2px solid #007bff" : "1px solid #dee2e6",
                borderRadius: "8px",
                cursor: "pointer",
                background: selectedBoard?.id === board.id ? "#e7f3ff" : "white",
                marginBottom: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedBoard?.id !== board.id) {
                  (e.target as HTMLElement).style.background = "#f8f9fa";
                  (e.target as HTMLElement).style.borderColor = "#adb5bd";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBoard?.id !== board.id) {
                  (e.target as HTMLElement).style.background = "white";
                  (e.target as HTMLElement).style.borderColor = "#dee2e6";
                }
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: board.is_default ? "#007bff" : "#28a745",
                }} />
                <div style={{
                  fontWeight: "600",
                  color: "#343a40",
                  fontSize: "14px",
                }}>
                  {board.name}
                </div>
              </div>
              
              {board.description && (
                <div style={{
                  fontSize: "12px",
                  color: "#6c757d",
                  marginLeft: "16px",
                }}>
                  {board.description}
                </div>
              )}
              
              <div style={{
                fontSize: "11px",
                color: "#6c757d",
                marginLeft: "16px",
                marginTop: "4px",
              }}>
                {(board.order_users || []).length} order user{(board.order_users || []).length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Order Users Configuration */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}>
          {selectedBoard ? (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#343a40", fontSize: "18px" }}>
                  Order Users for "{selectedBoard.name}"
                </h3>
                <p style={{ margin: "0 0 16px 0", color: "#6c757d", fontSize: "14px" }}>
                  Select which users can create orders on this board. If no users are selected, 
                  all users with order permissions can create orders.
                </p>
              </div>

              {/* Success/Error Messages */}
              {success && (
                <div style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  border: "1px solid #c3e6cb",
                }}>
                  ✅ {success}
                </div>
              )}

              {error && (
                <div style={{
                  background: "#f8d7da",
                  color: "#721c24",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  border: "1px solid #f5c6cb",
                }}>
                  ❌ {error}
                </div>
              )}

              {/* User Selection */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#2c3e50",
                  marginBottom: "8px"
                }}>
                  Authorized Order Users
                </label>
                <MultiUserAssignment
                  users={users}
                  selectedAssignments={currentOrderAssignments}
                  onChange={handleOrderUsersChange}
                  placeholder="Select users who can create orders on this board..."
                />
              </div>

              {/* Save Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  onClick={handleSaveOrderUsers}
                  disabled={saving}
                  style={{
                    background: saving ? "#6c757d" : "#28a745",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background 0.2s ease",
                    opacity: saving ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      (e.target as HTMLElement).style.background = "#218838";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      (e.target as HTMLElement).style.background = "#28a745";
                    }
                  }}
                >
                  {saving ? "⏳ Saving..." : "💾 Save Order Users"}
                </button>
              </div>

              {/* Info Box */}
              <div style={{
                background: "#e7f3ff",
                border: "1px solid #bee5eb",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "20px",
              }}>
                <div style={{ 
                  fontSize: "14px", 
                  color: "#0c5460",
                  lineHeight: "1.5"
                }}>
                  <strong>ℹ️ How Order Users Work:</strong>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                    <li>If no users are selected, any user with "can_access_orders" permission can create orders</li>
                    <li>If users are selected, only those users can create orders on this board</li>
                    <li>Users still need the "can_access_orders" permission to see the Orders menu</li>
                    <li>Orders are automatically assigned to the first column of the board</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              textAlign: "center",
              padding: "40px",
              color: "#6c757d",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>👈</div>
              <p>Select a board from the left to configure order users.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}