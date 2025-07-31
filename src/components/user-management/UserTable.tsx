"use client";

import { User } from "@/api/generated/interfaces";

interface PaginationInfo {
  count: number;
  next: string | null;
  previous: string | null;
  currentPage: number;
  totalPages: number;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  selectedUsers: number[];
  onSelectionChange: (selectedUsers: number[]) => void;
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  onView: (user: User) => void;
  onChangeStatus: (userId: number, status: string) => void;
  onResetPassword: (userId: number) => void;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export default function UserTable({
  users,
  loading,
  selectedUsers,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  onChangeStatus,
  onResetPassword,
  pagination,
  onPageChange,
}: UserTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(users.map((user) => user.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUsers, userId]);
    } else {
      onSelectionChange(selectedUsers.filter((id) => id !== userId));
    }
  };

  const isAllSelected =
    users.length > 0 && selectedUsers.length === users.length;
  const isIndeterminate =
    selectedUsers.length > 0 && selectedUsers.length < users.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleColor = (role?: any) => {
    switch (role?.toString().toLowerCase()) {
      case "admin":
        return "role-admin";
      case "manager":
        return "role-manager";
      case "agent":
        return "role-agent";
      case "viewer":
        return "role-viewer";
      default:
        return "role-default";
    }
  };

  const getStatusColor = (status?: any) => {
    switch (status?.toString().toLowerCase()) {
      case "active":
        return "status-active";
      case "inactive":
        return "status-inactive";
      case "pending":
        return "status-pending";
      case "suspended":
        return "status-suspended";
      default:
        return "status-default";
    }
  };

  const renderPagination = () => {
    const { currentPage, totalPages } = pagination;
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button className="pagination-btn" onClick={() => onPageChange(1)}>
              1
            </button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}

        {pageNumbers.map((page) => (
          <button
            key={page}
            className={`pagination-btn ${page === currentPage ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="pagination-ellipsis">...</span>
            )}
            <button
              className="pagination-btn"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="user-table-container">
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-row">
                  <div className="loading-spinner"></div>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={selectedUsers.includes(user.id) ? "selected" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) =>
                        handleSelectUser(user.id, e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <div className="user-name" onClick={() => onView(user)}>
                      <div className="name">
                        {user.full_name ||
                          `${user.first_name} ${user.last_name}`}
                      </div>
                      {user.job_title && (
                        <div className="job-title">{user.job_title}</div>
                      )}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${getRoleColor(user.role)}`}>
                      {user.role?.toString() || "User"}
                    </span>
                  </td>
                  <td>{user.department || "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusColor(user.status)}`}
                    >
                      {user.is_active
                        ? user.status?.toString() || "Active"
                        : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {user.last_login ? formatDate(user.last_login) : "Never"}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => onView(user)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => onEdit(user)}
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn reset-btn"
                        onClick={() => onResetPassword(user.id)}
                        title="Reset Password"
                      >
                        🔄
                      </button>
                      <button
                        className="action-btn status-btn"
                        onClick={() =>
                          onChangeStatus(
                            user.id,
                            user.is_active ? "inactive" : "active"
                          )
                        }
                        title={user.is_active ? "Deactivate" : "Activate"}
                      >
                        {user.is_active ? "🔓" : "🔒"}
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => onDelete(user.id)}
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="table-footer">
          <div className="results-info">
            Showing {(pagination.currentPage - 1) * 20 + 1} to{" "}
            {Math.min(pagination.currentPage * 20, pagination.count)} of{" "}
            {pagination.count} users
          </div>
          {renderPagination()}
        </div>
      )}

      <style jsx>{`
        .user-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .user-table-wrapper {
          overflow-x: auto;
        }

        .user-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .user-table th,
        .user-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .user-table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .user-table tr:hover {
          background-color: #f9fafb;
        }

        .user-table tr.selected {
          background-color: #eff6ff;
        }

        .user-name {
          cursor: pointer;
        }

        .user-name .name {
          font-weight: 500;
          color: #1f2937;
        }

        .user-name .job-title {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .role-badge,
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .role-admin {
          background-color: #fef2f2;
          color: #dc2626;
        }
        .role-manager {
          background-color: #fef3c7;
          color: #d97706;
        }
        .role-agent {
          background-color: #dbeafe;
          color: #2563eb;
        }
        .role-viewer {
          background-color: #f0fdf4;
          color: #16a34a;
        }
        .role-default {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .status-active {
          background-color: #dcfce7;
          color: #16a34a;
        }
        .status-inactive {
          background-color: #fef2f2;
          color: #dc2626;
        }
        .status-pending {
          background-color: #fef3c7;
          color: #d97706;
        }
        .status-suspended {
          background-color: #fee2e2;
          color: #dc2626;
        }
        .status-default {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .actions {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          padding: 4px 6px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .action-btn:hover {
          background-color: #f3f4f6;
        }

        .delete-btn:hover {
          background-color: #fef2f2;
        }

        .loading-row,
        .empty-row {
          text-align: center;
          padding: 40px 12px;
          color: #6b7280;
        }

        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .results-info {
          color: #6b7280;
          font-size: 14px;
        }

        .pagination {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .pagination-btn {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f3f4f6;
        }

        .pagination-btn.active {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          padding: 6px 4px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .user-table th,
          .user-table td {
            padding: 8px;
            font-size: 12px;
          }

          .actions {
            gap: 2px;
          }

          .action-btn {
            padding: 2px 4px;
            font-size: 12px;
          }

          .table-footer {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .pagination {
            justify-content: center;
          }

          .results-info {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
