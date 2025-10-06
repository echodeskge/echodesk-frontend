"use client";

import { useState } from "react";
import { boardsCreate } from "@/api/generated/api";
import type { Board } from "@/api/generated/interfaces";
import { Spinner } from "@/components/ui/spinner";

interface BoardFormProps {
  onSave?: (board: Board) => void;
  onCancel?: () => void;
}

export default function BoardForm({ onSave, onCancel }: BoardFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_default: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Board name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newBoard = await boardsCreate({
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      } as any);

      onSave?.(newBoard);
    } catch (err: any) {
      console.error("Failed to create board:", err);
      setError("Failed to create board. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        maxWidth: "500px",
        margin: "20px auto",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "600",
          margin: "0 0 20px 0",
          color: "#333",
        }}
      >
        Create New Board
      </h2>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              background: "#fee",
              color: "#c33",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#555",
            }}
          >
            Board Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Enter board name"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
              color: "#555",
            }}
          >
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter board description (optional)"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#555",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({ ...formData, is_default: e.target.checked })
              }
              style={{ marginRight: "4px" }}
              disabled={loading}
            />
            Set as default board
          </label>
          <div
            style={{
              fontSize: "12px",
              color: "#6c757d",
              marginTop: "4px",
              marginLeft: "20px",
            }}
          >
            Users will see this board first when they visit tickets
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "transparent",
              color: "#6c757d",
              border: "1px solid #ddd",
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {loading && <Spinner className="mr-2 size-4" />}
            {loading ? "Creating..." : "Create Board"}
          </button>
        </div>
      </form>

    </div>
  );
}