"use client";

import { User } from "@/api/generated/interfaces";

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  onChangeStatus: (userId: number, status: string) => void;
  onResetPassword: (userId: number) => void;
}

export default function UserDetailsModal({
  user,
  onClose,
  onEdit,
  onDelete,
  onChangeStatus,
  onResetPassword,
}: UserDetailsModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleColor = (role?: any) => {
    switch (role?.toString().toLowerCase()) {
      case "admin":
        return "#dc2626";
      case "manager":
        return "#d97706";
      case "agent":
        return "#2563eb";
      case "viewer":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  const getStatusColor = (status?: any, isActive?: boolean) => {
    if (!isActive) return "#dc2626";

    switch (status?.toString().toLowerCase()) {
      case "active":
        return "#16a34a";
      case "inactive":
        return "#dc2626";
      case "pending":
        return "#d97706";
      case "suspended":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="user-details-overlay" onClick={onClose}>
      <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="user-header-info">
            <div className="user-avatar">
              {user.first_name?.[0] || user.email[0]?.toUpperCase()}
            </div>
            <div className="user-basic-info">
              <h2>
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </h2>
              <p className="user-email">{user.email}</p>
              <div className="user-badges">
                <span
                  className="role-badge"
                  style={{
                    backgroundColor: `${getRoleColor(user.role)}15`,
                    color: getRoleColor(user.role),
                  }}
                >
                  {user.role?.toString() || "User"}
                </span>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${getStatusColor(user.status, user.is_active)}15`,
                    color: getStatusColor(user.status, user.is_active),
                  }}
                >
                  {user.is_active
                    ? user.status?.toString() || "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="info-section">
            <h3>Contact Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Email</label>
                <span>{user.email}</span>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <span>{user.phone_number || "Not provided"}</span>
              </div>

              <div className="info-item">
                <label>Job Title</label>
                <span>{user.job_title || "Not specified"}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Account Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Role</label>
                <span style={{ color: getRoleColor(user.role) }}>
                  {user.role?.toString() || "User"}
                </span>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span
                  style={{ color: getStatusColor(user.status, user.is_active) }}
                >
                  {user.is_active
                    ? user.status?.toString() || "Active"
                    : "Inactive"}
                </span>
              </div>
              <div className="info-item">
                <label>Staff Member</label>
                <span>{user.is_staff ? "Yes" : "No"}</span>
              </div>
              <div className="info-item">
                <label>Date Joined</label>
                <span>{formatDate(user.date_joined)}</span>
              </div>
              <div className="info-item">
                <label>Last Login</label>
                <span>
                  {user.last_login ? formatDate(user.last_login) : "Never"}
                </span>
              </div>
            </div>
          </div>

          {user.permissions && (
            <div className="info-section">
              <h3>Additional Permissions</h3>
              <div className="permissions-text">{user.permissions}</div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <div className="action-group">
            <button
              className="btn btn-primary"
              onClick={() => handleAction(() => onEdit(user))}
            >
              ✏️ Edit User
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => handleAction(() => onResetPassword(user.id))}
            >
              🔄 Reset Password
            </button>

            <button
              className="btn btn-secondary"
              onClick={() =>
                handleAction(() =>
                  onChangeStatus(
                    user.id,
                    user.is_active ? "inactive" : "active"
                  )
                )
              }
            >
              {user.is_active ? "🔒 Deactivate" : "🔓 Activate"}
            </button>
          </div>

          <div className="danger-actions">
            <button
              className="btn btn-danger"
              onClick={() => handleAction(() => onDelete(user.id))}
            >
              🗑️ Delete User
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .user-details-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .user-details-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .user-header-info {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .user-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          flex-shrink: 0;
        }

        .user-basic-info h2 {
          margin: 0 0 4px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .user-email {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 16px;
        }

        .user-badges {
          display: flex;
          gap: 8px;
        }

        .role-badge,
        .status-badge {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }

        .modal-content {
          padding: 24px;
        }

        .info-section {
          margin-bottom: 32px;
        }

        .info-section:last-child {
          margin-bottom: 0;
        }

        .info-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-item span {
          font-size: 14px;
          color: #1f2937;
          font-weight: 500;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .permission-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          background-color: #f9fafb;
        }

        .permission-status {
          font-size: 16px;
        }

        .permissions-text {
          background-color: #f3f4f6;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          color: #374151;
          white-space: pre-wrap;
        }

        .modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          gap: 16px;
        }

        .action-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .danger-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        .btn-danger {
          background-color: #dc2626;
          color: white;
        }

        .btn-danger:hover {
          background-color: #b91c1c;
        }

        @media (max-width: 768px) {
          .user-details-modal {
            margin: 0;
            border-radius: 0;
            max-height: 100vh;
          }

          .modal-header {
            padding: 16px;
          }

          .user-header-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .modal-content {
            padding: 16px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .permissions-grid {
            grid-template-columns: 1fr;
          }

          .modal-actions {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }

          .action-group {
            width: 100%;
            justify-content: center;
          }

          .btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
