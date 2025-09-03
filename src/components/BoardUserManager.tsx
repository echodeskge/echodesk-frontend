"use client";

import { useState, useEffect } from "react";
import { Board, User } from "@/api/generated/interfaces";
import { boardsRetrieve, boardsPartialUpdate } from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";

interface BoardUserManagerProps {
  boardId: number;
  onClose: () => void;
  onSave?: () => void;
}

export default function BoardUserManager({
  boardId,
  onClose,
  onSave,
}: BoardUserManagerProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orderUserIds, setOrderUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, [boardId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [boardResult, usersResult] = await Promise.all([
        boardsRetrieve(boardId),
        ticketService.getUsers()
      ]);

      setBoard(boardResult);
      setUsers(usersResult.results || []);
      
      // Set current order users
      const currentOrderUserIds = (boardResult.order_users || []).map(user => user.id);
      setOrderUserIds(currentOrderUserIds);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.response?.data?.detail || "Failed to load board data");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUsersChange = (assignments: AssignmentData[]) => {
    const userIds = assignments.map(assignment => assignment.userId);
    setOrderUserIds(userIds);
  };

  const handleSave = async () => {
    if (!board) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await boardsPartialUpdate(board.id, {
        order_user_ids: orderUserIds
      });

      setSuccess("Order users updated successfully!");
      
      // Refresh board data to get updated info
      await fetchData();
      
      if (onSave) {
        onSave();
      }
      
      // Auto-close after successful save
      setTimeout(() => {
        onClose();
      }, 1500);
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
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div style={{ color: "#6c757d" }}>Loading board data...</div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{
        padding: "20px",
        textAlign: "center",
        color: "#dc3545",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
        <div>Failed to load board information</div>
      </div>
    );
  }

  const currentOrderAssignments: AssignmentData[] = orderUserIds.map(userId => ({
    userId,
    role: 'collaborator' as const
  }));

  return (
    <div style={{ padding: "24px", minWidth: "500px", maxWidth: "600px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 8px 0", color: "#343a40", fontSize: "20px" }}>
          👥 Manage Order Users
        </h2>
        <p style={{ margin: "0", color: "#6c757d", fontSize: "14px" }}>
          Configure which users can create orders on <strong>"{board.name}"</strong>
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

      {/* Current Configuration Display */}
      <div style={{
        background: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "6px",
        padding: "16px",
        marginBottom: "20px",
      }}>
        <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Current Configuration:
        </div>
        <div style={{ fontSize: "13px", color: "#6c757d" }}>
          {orderUserIds.length === 0 ? (
            "📖 No specific users selected - all users with order permissions can create orders"
          ) : (
            `🔒 ${orderUserIds.length} specific user${orderUserIds.length !== 1 ? 's' : ''} can create orders on this board`
          )}
        </div>
      </div>

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
          placeholder="Select users who can create orders on this board (leave empty for all users with order permissions)..."
        />
      </div>

      {/* Info Box */}
      <div style={{
        background: "#e7f3ff",
        border: "1px solid #bee5eb",
        borderRadius: "6px",
        padding: "16px",
        marginBottom: "24px",
      }}>
        <div style={{ 
          fontSize: "14px", 
          color: "#0c5460",
          lineHeight: "1.5"
        }}>
          <strong>ℹ️ How This Works:</strong>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            <li>If no users are selected, any user with "Orders" permission can create orders</li>
            <li>If users are selected, only those users can create orders on this board</li>
            <li>Users still need the "Orders" permission in their group to see the Orders menu</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        paddingTop: "20px",
        borderTop: "1px solid #e1e5e9"
      }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            background: "#6c757d",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "⏳ Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}