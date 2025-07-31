"use client";

import { useState } from "react";

interface UserBulkActionsProps {
  selectedCount: number;
  selectedUsers: number[];
  onBulkAction: (
    action: string,
    userIds: number[],
    additionalData?: any
  ) => Promise<void>;
}

export default function UserBulkActions({
  selectedCount,
  selectedUsers,
  onBulkAction,
}: UserBulkActionsProps) {
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkAction = async (action: string, additionalData?: any) => {
    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedCount} selected user(s)?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await onBulkAction(action, selectedUsers, additionalData);
    } catch (error) {
      console.error("Bulk action failed:", error);
    } finally {
      setIsLoading(false);
      setShowActions(false);
    }
  };

  const bulkActions = [
    {
      id: "activate",
      label: "Activate Users",
      icon: "✅",
      color: "green",
      confirm: true,
    },
    {
      id: "deactivate",
      label: "Deactivate Users",
      icon: "❌",
      color: "red",
      confirm: true,
    },
    {
      id: "reset_password",
      label: "Reset Passwords",
      icon: "🔄",
      color: "blue",
      confirm: true,
    },
    {
      id: "change_role_admin",
      label: "Make Admin",
      icon: "👑",
      color: "purple",
      confirm: true,
      additionalData: { role: "admin" },
    },
    {
      id: "change_role_agent",
      label: "Make Agent",
      icon: "🎧",
      color: "blue",
      confirm: true,
      additionalData: { role: "agent" },
    },
    {
      id: "change_role_viewer",
      label: "Make Viewer",
      icon: "👁️",
      color: "gray",
      confirm: true,
      additionalData: { role: "viewer" },
    },
  ];

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-info">
        <span className="selected-count">
          {selectedCount} user{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="bulk-actions-controls">
        <button
          className="bulk-actions-toggle"
          onClick={() => setShowActions(!showActions)}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Bulk Actions"} ▼
        </button>
      </div>

      {showActions && (
        <div className="bulk-actions-dropdown">
          <div className="dropdown-header">
            <h4>Bulk Actions</h4>
            <button
              className="close-dropdown"
              onClick={() => setShowActions(false)}
            >
              ×
            </button>
          </div>

          <div className="dropdown-content">
            <div className="action-section">
              <h5>User Status</h5>
              <div className="action-buttons">
                <button
                  className="action-btn action-green"
                  onClick={() => handleBulkAction("activate")}
                  disabled={isLoading}
                >
                  ✅ Activate Users
                </button>
                <button
                  className="action-btn action-red"
                  onClick={() => handleBulkAction("deactivate")}
                  disabled={isLoading}
                >
                  ❌ Deactivate Users
                </button>
              </div>
            </div>

            <div className="action-section">
              <h5>Security</h5>
              <div className="action-buttons">
                <button
                  className="action-btn action-blue"
                  onClick={() => handleBulkAction("reset_password")}
                  disabled={isLoading}
                >
                  🔄 Reset Passwords
                </button>
              </div>
            </div>

            <div className="action-section">
              <h5>Role Changes</h5>
              <div className="action-buttons">
                <button
                  className="action-btn action-purple"
                  onClick={() =>
                    handleBulkAction("change_role", { role: "admin" })
                  }
                  disabled={isLoading}
                >
                  👑 Make Admin
                </button>
                <button
                  className="action-btn action-blue"
                  onClick={() =>
                    handleBulkAction("change_role", { role: "manager" })
                  }
                  disabled={isLoading}
                >
                  👨‍💼 Make Manager
                </button>
                <button
                  className="action-btn action-green"
                  onClick={() =>
                    handleBulkAction("change_role", { role: "agent" })
                  }
                  disabled={isLoading}
                >
                  🎧 Make Agent
                </button>
                <button
                  className="action-btn action-gray"
                  onClick={() =>
                    handleBulkAction("change_role", { role: "viewer" })
                  }
                  disabled={isLoading}
                >
                  👁️ Make Viewer
                </button>
              </div>
            </div>

            <div className="action-section danger-section">
              <h5>Danger Zone</h5>
              <div className="action-buttons">
                <button
                  className="action-btn action-red"
                  onClick={() => handleBulkAction("delete")}
                  disabled={isLoading}
                >
                  🗑️ Delete Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bulk-actions {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .bulk-actions-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-count {
          font-weight: 600;
          color: #1e40af;
          font-size: 14px;
        }

        .bulk-actions-controls {
          position: relative;
        }

        .bulk-actions-toggle {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .bulk-actions-toggle:hover:not(:disabled) {
          background: #2563eb;
        }

        .bulk-actions-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .bulk-actions-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 300px;
          max-width: 400px;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .dropdown-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .close-dropdown {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #64748b;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-dropdown:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .dropdown-content {
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
        }

        .action-section {
          margin-bottom: 20px;
        }

        .action-section:last-child {
          margin-bottom: 0;
        }

        .action-section h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .danger-section h5 {
          color: #dc2626;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s;
          background: white;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-green {
          border-color: #d1fae5;
          color: #065f46;
        }

        .action-green:hover:not(:disabled) {
          background: #d1fae5;
        }

        .action-red {
          border-color: #fee2e2;
          color: #dc2626;
        }

        .action-red:hover:not(:disabled) {
          background: #fee2e2;
        }

        .action-blue {
          border-color: #dbeafe;
          color: #1e40af;
        }

        .action-blue:hover:not(:disabled) {
          background: #dbeafe;
        }

        .action-purple {
          border-color: #e9d5ff;
          color: #7c3aed;
        }

        .action-purple:hover:not(:disabled) {
          background: #e9d5ff;
        }

        .action-gray {
          border-color: #f3f4f6;
          color: #4b5563;
        }

        .action-gray:hover:not(:disabled) {
          background: #f3f4f6;
        }

        @media (max-width: 768px) {
          .bulk-actions {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .bulk-actions-dropdown {
            position: fixed;
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            width: 90vw;
            max-width: 350px;
            z-index: 2000;
          }

          .bulk-actions-dropdown::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: -1;
          }
        }
      `}</style>
    </div>
  );
}
