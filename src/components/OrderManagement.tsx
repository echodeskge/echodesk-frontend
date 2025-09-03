"use client";

import { useState, useEffect } from "react";
import { Board, User } from "@/api/generated/interfaces";
import { boardsList } from "@/api/generated/api";
import { AuthService } from "@/services/auth";
import OrderForm from "./OrderForm";

interface OrderManagementProps {}

export default function OrderManagement({}: OrderManagementProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      
      // Get current user and boards in parallel
      const [userResponse, boardsResponse] = await Promise.all([
        authService.getCurrentUser(),
        boardsList()
      ]);
      
      setCurrentUser(userResponse);
      
      // Backend now handles filtering based on user permissions and board attachments
      // No need for client-side filtering - trust the API response
      const availableBoards = boardsResponse.results || [];
      
      console.log('Available boards from API:', availableBoards.length);
      console.log('Current user:', userResponse.email);
      console.log('Boards:', availableBoards.map(b => ({
        id: b.id,
        name: b.name,
        order_users_count: b.order_users?.length || 0
      })));
      
      setBoards(availableBoards);
      
      // Auto-select first board if available
      if (availableBoards.length > 0) {
        setSelectedBoard(availableBoards[0]);
      } else {
        setSelectedBoard(null);
      }
    } catch (error) {
      console.error("Failed to fetch boards:", error);
    } finally {
      setLoading(false);
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
          {currentUser ? 
            "You don't have access to any boards for order creation. Contact your administrator to assign you to boards with order permissions." :
            "You need access to at least one board to create orders."
          }
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <h1 style={{ 
            margin: "0 0 8px 0", 
            color: "#343a40",
            fontSize: "24px",
            fontWeight: "600"
          }}>
            📝 Order Management
          </h1>
          <p style={{ 
            margin: 0, 
            color: "#6c757d",
            fontSize: "14px" 
          }}>
            Create and manage orders for your assigned boards
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!selectedBoard}
          style={{
            background: selectedBoard ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: selectedBoard ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (selectedBoard) {
              (e.target as HTMLElement).style.background = "#0056b3";
            }
          }}
          onMouseLeave={(e) => {
            if (selectedBoard) {
              (e.target as HTMLElement).style.background = "#007bff";
            }
          }}
        >
          <span>+</span>
          Create Order
        </button>
      </div>

      {/* Board Selection */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
        }}>
          <h3 style={{ margin: 0, color: "#343a40", fontSize: "18px" }}>
            Select Board
          </h3>
          <div style={{
            fontSize: "12px",
            color: "#6c757d",
            background: "#f8f9fa",
            padding: "4px 8px",
            borderRadius: "12px",
            border: "1px solid #dee2e6",
          }}>
            {boards.length} board{boards.length !== 1 ? 's' : ''} available
          </div>
        </div>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => setSelectedBoard(board)}
              style={{
                padding: "16px",
                border: selectedBoard?.id === board.id ? "2px solid #007bff" : "1px solid #dee2e6",
                borderRadius: "8px",
                cursor: "pointer",
                background: selectedBoard?.id === board.id ? "#e7f3ff" : "white",
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
                gap: "12px",
                marginBottom: "8px",
              }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: board.is_default ? "#007bff" : "#28a745",
                }} />
                <div style={{
                  fontWeight: "600",
                  color: "#343a40",
                  fontSize: "16px",
                }}>
                  {board.name}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "#6c757d",
                  background: "#f8f9fa",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}>
                  {board.columns_count} columns
                </div>
              </div>
              
              {board.description && (
                <div style={{
                  fontSize: "13px",
                  color: "#6c757d",
                  lineHeight: "1.4",
                }}>
                  {board.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Board Info */}
      {selectedBoard && (
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}>
          <h3 style={{ 
            margin: "0 0 16px 0", 
            color: "#343a40",
            fontSize: "18px" 
          }}>
            Selected: {selectedBoard.name}
          </h3>
          
          <div style={{ color: "#6c757d", fontSize: "14px" }}>
            Orders created for this board will be automatically assigned to the first column.
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateForm && selectedBoard && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShowCreateForm(false)}
          />
          
          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              zIndex: 1000,
              width: "90vw",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div style={{
              position: "sticky",
              top: 0,
              background: "white",
              padding: "16px 24px",
              borderBottom: "1px solid #e1e5e9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 1001,
            }}>
              <div>
                <h3 style={{ margin: 0, color: "#343a40", fontSize: "20px" }}>
                  Create Order for {selectedBoard.name}
                </h3>
                <div style={{ 
                  fontSize: "12px", 
                  color: "#6c757d", 
                  marginTop: "4px" 
                }}>
                  Board: {selectedBoard.name} ({selectedBoard.columns_count} columns)
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                  padding: "0",
                  lineHeight: "1",
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: "0" }}>
              <OrderForm
                boardId={selectedBoard.id}
                onSave={(orderId) => {
                  setShowCreateForm(false);
                  // TODO: Refresh orders list or show success message
                  console.log('Order created with ID:', orderId);
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}