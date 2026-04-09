import React, { useState, useEffect } from "react";
import {
  columnsList,
  columnsCreate,
  columnsUpdate,
  columnsDestroy,
  boardsList,
  boardsDefaultRetrieve,
} from "../api/generated/api";
import {
  TicketColumn,
  TicketColumnCreate,
  TicketColumnUpdate,
  Board,
} from "../api/generated/interfaces";
import { Spinner } from "@/components/ui/spinner";
import { useTranslations } from "next-intl";

interface StatusManagementProps {
  onStatusChange?: () => void;
}

const StatusManagement: React.FC<StatusManagementProps> = ({
  onStatusChange,
}) => {
  const t = useTranslations("tickets");
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
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

  const fetchBoards = async () => {
    try {
      const data = await boardsList();
      setBoards(data.results || []);
      
      // Set default board as selected if no board is selected
      if (!selectedBoard && data.results && data.results.length > 0) {
        const defaultBoard = data.results.find(board => board.is_default) || data.results[0];
        setSelectedBoard(defaultBoard);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusManagement.failedToLoadBoards"));
    }
  };

  const fetchColumns = async () => {
    if (!selectedBoard) return;
    
    setLoading(true);
    setError(null);

    try {
      // Filter columns by the selected board
      const data = await columnsList(selectedBoard.id);
      setColumns(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusManagement.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchColumns();
    }
  }, [selectedBoard]);

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
          board: selectedBoard?.id!,
        };
        await columnsUpdate(editingColumn.id, updateData);
        setSuccess(t("statusManagement.columnUpdated"));
      } else {
        // Create new column - include board reference
        const createData: TicketColumnCreate = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          position: formData.position,
          is_default: formData.is_default,
          is_closed_status: formData.is_closed_status,
          track_time: formData.track_time,
          board: selectedBoard?.id!,
        };
        await columnsCreate(createData);
        setSuccess(t("statusManagement.columnCreated"));
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
      setError(err instanceof Error ? err.message : t("statusManagement.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (column: TicketColumn) => {
    if (!confirm(t("statusManagement.confirmDelete", { columnName: column.name }))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await columnsDestroy(column.id);
      setSuccess(t("statusManagement.columnDeleted"));

      // Refresh columns list
      await fetchColumns();

      // Call callback if provided
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusManagement.errorOccurred"));
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
        <h2 style={{ margin: 0, color: "#333" }}>{t("statusManagement.title")}</h2>
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
          disabled={!selectedBoard}
        >
          {t("statusManagement.createStatus")}
        </button>
      </div>

      {/* Board Selection */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          {t("statusManagement.selectBoard")}
        </label>
        <select
          value={selectedBoard?.id || ""}
          onChange={(e) => {
            const board = boards.find(b => b.id === parseInt(e.target.value));
            setSelectedBoard(board || null);
          }}
          style={{
            width: "300px",
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: "white",
          }}
        >
          <option value="">{t("statusManagement.selectBoardPlaceholder")}</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name} {board.is_default ? `(${t("statusManagement.default")})` : ""}
            </option>
          ))}
        </select>
        {selectedBoard && (
          <p style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
            {t("statusManagement.managingStatusesFor", { boardName: selectedBoard.name })}
          </p>
        )}
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
            {t("statusManagement.loadingColumns")}
          </div>
        ) : columns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
            {t("statusManagement.noColumnsFound")}
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
                      {t("statusManagement.defaultBadge")}
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
                      {t("statusManagement.closedBadge")}
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
                      {t("statusManagement.timeTrackBadge")}
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
                  {column.description || t("statusManagement.noDescription")}
                </p>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "4px",
                  }}
                >
                  {t("statusManagement.position")} {column.position} | {t("statusManagement.color")} {column.color}
                  {column.board && (
                    <span style={{ marginLeft: "8px" }}>
                      | {t("statusManagement.boardId")} {column.board}
                    </span>
                  )}
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
                  {t("statusManagement.edit")}
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
                  {t("statusManagement.delete")}
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
                {editingColumn ? t("statusManagement.editStatusColumn") : t("statusManagement.createStatusColumn")}
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
                  {t("statusManagement.nameLabel")}
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
                  placeholder={t("statusManagement.namePlaceholder")}
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
                  {t("statusManagement.descriptionLabel")}
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
                  placeholder={t("statusManagement.descriptionPlaceholder")}
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
                  {t("statusManagement.positionLabel")}
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
                  {t("statusManagement.colorLabel")}
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
                      {t("statusManagement.defaultStatusCheckbox")}
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
                      {t("statusManagement.closedStatusCheckbox")}
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
                      {t("statusManagement.trackTimeCheckbox")}
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
                  {t("statusManagement.cancel")}
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
                  {loading && <Spinner className="mr-2 size-4" />}
                  {loading ? t("statusManagement.saving") : editingColumn ? t("statusManagement.update") : t("statusManagement.create")}
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