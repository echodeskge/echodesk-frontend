"use client";

import React, { useState, useEffect } from "react";
import {
  columnsList,
  columnsCreate,
  columnsUpdate,
  columnsDestroy,
  boardsRetrieve,
} from "../api/generated/api";
import {
  TicketColumn,
  TicketColumnCreate,
  TicketColumnUpdate,
  Board,
} from "../api/generated/interfaces";

interface BoardStatusEditorProps {
  boardId: number;
  onClose: () => void;
  onStatusChange?: () => void;
}

const BoardStatusEditor: React.FC<BoardStatusEditorProps> = ({
  boardId,
  onClose,
  onStatusChange,
}) => {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<TicketColumn | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    position: 0,
    is_default: false,
    is_closed_status: false,
    track_time: false,
  });

  const fetchBoard = async () => {
    try {
      const boardData = await boardsRetrieve(boardId.toString());
      setBoard(boardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    }
  };

  const fetchColumns = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await columnsList(boardId);
      setColumns(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchColumns();
  }, [boardId]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#6B7280",
      position: columns.length,
      is_default: false,
      is_closed_status: false,
      track_time: false,
    });
    setEditingColumn(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (column: TicketColumn) => {
    setFormData({
      name: column.name,
      description: column.description || "",
      color: column.color || "#6B7280",
      position: column.position || 0,
      is_default: column.is_default || false,
      is_closed_status: column.is_closed_status || false,
      track_time: column.track_time || false,
    });
    setEditingColumn(column);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingColumn) {
        // Update existing column
        const updateData: TicketColumnUpdate = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          position: formData.position,
          is_default: formData.is_default,
          is_closed_status: formData.is_closed_status,
          track_time: formData.track_time,
          board: boardId,
        };
        await columnsUpdate(editingColumn.id, updateData);
        setSuccess("Column updated successfully!");
      } else {
        // Create new column
        const createData: TicketColumnCreate = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          position: formData.position,
          is_default: formData.is_default,
          is_closed_status: formData.is_closed_status,
          track_time: formData.track_time,
          board: boardId,
        };
        await columnsCreate(createData);
        setSuccess("Column created successfully!");
      }

      // Refresh columns list
      await fetchColumns();
      closeDialog();
      onStatusChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (columnId: number) => {
    if (!window.confirm("Are you sure you want to delete this column?")) {
      return;
    }

    try {
      await columnsDestroy(columnId);
      setSuccess("Column deleted successfully!");
      await fetchColumns();
      onStatusChange?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete column");
    }
  };

  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: "rgba(0, 0, 0, 0.5)", 
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ 
        background: "white", 
        borderRadius: "12px", 
        width: "90vw", 
        maxWidth: "800px", 
        maxHeight: "90vh", 
        overflow: "auto",
        padding: "20px" 
      }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #e9ecef",
            paddingBottom: "15px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#333" }}>
              Edit Statuses - {board?.name}
            </h2>
            <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              Manage ticket status columns for this board
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={openCreateDialog}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              + Create Status
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
              border: "1px solid #f5c6cb",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
              border: "1px solid #c3e6cb",
            }}
          >
            {success}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#666",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #f3f3f3",
                borderTop: "3px solid #007bff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            ></div>
            Loading columns...
          </div>
        )}

        {/* Columns List */}
        {!loading && (
          <>
            {columns.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#666",
                }}
              >
                <p>No status columns found for this board.</p>
                <button
                  onClick={openCreateDialog}
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Create First Status
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {columns
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((column) => (
                    <div
                      key={column.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "16px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "8px",
                        border: "1px solid #dee2e6",
                      }}
                    >
                      {/* Color indicator */}
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: column.color || "#6B7280",
                          marginRight: "12px",
                        }}
                      />

                      {/* Column info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: "0 0 4px 0", color: "#333" }}>
                          {column.name}
                          {column.is_default && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                backgroundColor: "#007bff",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              DEFAULT
                            </span>
                          )}
                          {column.is_closed_status && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                backgroundColor: "#28a745",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              CLOSED
                            </span>
                          )}
                          {column.track_time && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                backgroundColor: "#fd7e14",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              TRACK TIME
                            </span>
                          )}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          {column.description || "No description"}
                        </p>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#9ca3af",
                            marginTop: "4px",
                          }}
                        >
                          Position: {column.position} | Color: {column.color} | {column.tickets_count} tickets
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => openEditDialog(column)}
                          style={{
                            backgroundColor: "#ffc107",
                            color: "#212529",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(column.id)}
                          style={{
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Form Dialog */}
        {dialogOpen && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              background: "white",
              borderRadius: "12px",
              width: "90vw",
              maxWidth: "500px",
              padding: "20px",
            }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
                {editingColumn ? "Edit Status Column" : "Create New Status Column"}
              </h3>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "14px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "4px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        height: "40px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
                      Position
                    </label>
                    <input
                      type="number"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                      min={0}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    Default Status
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={formData.is_closed_status}
                      onChange={(e) => setFormData({ ...formData, is_closed_status: e.target.checked })}
                    />
                    Closed Status
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={formData.track_time}
                      onChange={(e) => setFormData({ ...formData, track_time: e.target.checked })}
                    />
                    Track Time
                  </label>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeDialog}
                    style={{
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? "Saving..." : editingColumn ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardStatusEditor;