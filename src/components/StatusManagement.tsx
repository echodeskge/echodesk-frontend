import React, { useState, useEffect } from "react";
import {
  columnsList,
  columnsCreate,
  columnsUpdate,
  columnsDestroy,
} from "../api/generated/api";
import {
  TicketColumn,
  TicketColumnCreate,
  TicketColumnUpdate,
} from "../api/generated/interfaces";

interface StatusManagementProps {
  onStatusChange?: () => void;
}

const StatusManagement: React.FC<StatusManagementProps> = ({
  onStatusChange,
}) => {
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

  const fetchColumns = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await columnsList();
      setColumns(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#6B7280",
      position: 0,
      is_default: false,
      is_closed_status: false,
      track_time: false,
    });
    setEditingColumn(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setFormData({ ...formData, position: columns.length });
    setDialogOpen(true);
  };

  const openEditDialog = (column: TicketColumn) => {
    setEditingColumn(column);
    setFormData({
      name: column.name,
      description: column.description || "",
      color: column.color || "#6B7280",
      position: column.position || 0,
      is_default: column.is_default || false,
      is_closed_status: column.is_closed_status || false,
      track_time: column.track_time || false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
    setError(null);
    setSuccess(null);
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
        };
        await columnsCreate(createData);
        setSuccess("Column created successfully!");
      }

      // Refresh columns list
      await fetchColumns();

      // Call callback if provided
      if (onStatusChange) {
        onStatusChange();
      }

      // Close dialog
      setTimeout(() => {
        closeDialog();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (column: TicketColumn) => {
    if (!confirm(`Are you sure you want to delete the "${column.name}" column?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await columnsDestroy(column.id);
      setSuccess("Column deleted successfully!");

      // Refresh columns list
      await fetchColumns();

      // Call callback if provided
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, color: "#333" }}>Ticket Status Management</h2>
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

      {/* Columns List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
            Loading columns...
          </div>
        ) : columns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
            No ticket columns found. Create your first status column!
          </div>
        ) : (
          columns.map((column) => (
            <div
              key={column.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              {/* Color indicator */}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: column.color || "#6c757d",
                  borderRadius: "50%",
                  marginRight: "12px",
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px #ddd",
                }}
              />

              {/* Column info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    {column.name}
                  </h4>
                  {column.is_default && (
                    <span
                      style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        fontWeight: "600",
                      }}
                    >
                      DEFAULT
                    </span>
                  )}
                  {column.is_closed_status && (
                    <span
                      style={{
                        backgroundColor: "#6c757d",
                        color: "white",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        fontWeight: "600",
                      }}
                    >
                      CLOSED
                    </span>
                  )}
                  {column.track_time && (
                    <span
                      style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ⏱️ TIME TRACK
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#6c757d",
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
                  Position: {column.position} | Color: {column.color}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => openEditDialog(column)}
                  style={{
                    backgroundColor: "#17a2b8",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(column)}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#333" }}>
                {editingColumn ? "Edit Status Column" : "Create Status Column"}
              </h3>
              <button
                onClick={closeDialog}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  placeholder="Enter status name (e.g., 'In Progress')"
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  placeholder="Optional description for this status"
                />
              </div>

              {/* Position */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Position
                </label>
                <input
                  type="number"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", parseInt(e.target.value))}
                  min="0"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Color
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      cursor: "pointer",
                      padding: "0",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#6c757d" }}>
                    {formData.color}
                  </span>
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => handleInputChange("is_default", e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "14px", color: "#333" }}>
                      Default status for new tickets
                    </span>
                  </label>
                </div>

                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.is_closed_status}
                      onChange={(e) => handleInputChange("is_closed_status", e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "14px", color: "#333" }}>
                      This is a closed/completed status
                    </span>
                  </label>
                </div>

                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.track_time}
                      onChange={(e) => handleInputChange("track_time", e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "14px", color: "#333" }}>
                      Track time spent in this column
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={closeDialog}
                  style={{
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
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
                    backgroundColor: loading ? "#6c757d" : "#007bff",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
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
  );
};

export default StatusManagement;