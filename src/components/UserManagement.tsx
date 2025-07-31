"use client";

import { useState, useEffect } from "react";
import {
  User,
  UserCreate,
  PaginatedUserList,
  UserUpdate,
} from "@/api/generated/interfaces";
import * as api from "@/api/generated/api";

import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import UserTable from "./user-management/UserTable";
import UserBulkActions from "./user-management/UserBulkActions";
import UserForm from "./user-management/UserForm";
import UserDetailsModal from "./user-management/UserDetailsModal";
import UserFilters from "./user-management/UserFilters";

export interface UserFilters {
  search: string;
  role: string;
  status: string;
  department: string;
  isActive: boolean | null;
  isStaff: boolean | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    currentPage: 1,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "",
    status: "",
    department: "",
    isActive: null,
    isStaff: null,
  });

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response: PaginatedUserList = await api.usersList(
        undefined, // ordering
        pagination.currentPage,
        filters.search || undefined
      );

      setUsers(response.results);
      setPagination((prev) => ({
        ...prev,
        count: response.count,
        next: response.next || null,
        previous: response.previous || null,
        totalPages: Math.ceil(response.count / 20), // Assuming 20 items per page
      }));
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: UserCreate | UserUpdate) => {
    try {
      await api.usersCreate(userData as UserCreate);
      setShowCreateForm(false);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || err.message || "Failed to create user"
      );
    }
  };

  const handleUpdateUser = async (
    userId: number,
    userData: UserCreate | UserUpdate
  ) => {
    try {
      await api.usersUpdate(userId, userData as UserUpdate);
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      throw new Error(
        err.response?.data?.detail || err.message || "Failed to update user"
      );
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await api.usersDestroy(userId);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      alert(
        err.response?.data?.detail || err.message || "Failed to delete user"
      );
    }
  };

  const handleChangeUserStatus = async (userId: number, status: string) => {
    try {
      await api.usersPartialUpdate(userId, { status: status as any });
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
          err.message ||
          "Failed to change user status"
      );
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (
      !confirm(
        "Are you sure you want to reset this user's password? They will receive an email with instructions."
      )
    ) {
      return;
    }

    try {
      await api.usersChangePasswordCreate(userId, {} as User);
      alert("Password reset email sent successfully");
    } catch (err: any) {
      alert(
        err.response?.data?.detail || err.message || "Failed to reset password"
      );
    }
  };

  const handleBulkAction = async (
    action: string,
    userIds: number[],
    additionalData?: any
  ) => {
    try {
      const bulkActionData: any = {
        user_ids: userIds,
        action: action as any,
        ...additionalData,
      };

      await api.usersBulkActionCreate(bulkActionData);
      setSelectedUsers([]);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || "Bulk action failed");
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleFiltersChange = (newFilters: Partial<UserFilters>) => {
    setFilters((prev: UserFilters) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Add User
        </button>
      </div>

      {error && <ErrorMessage error={error} />}

      <UserFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {selectedUsers.length > 0 && (
        <UserBulkActions
          selectedCount={selectedUsers.length}
          onBulkAction={handleBulkAction}
          selectedUsers={selectedUsers}
        />
      )}

      <UserTable
        users={users}
        loading={loading}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
        onEdit={setEditingUser}
        onDelete={handleDeleteUser}
        onView={setViewingUser}
        onChangeStatus={handleChangeUserStatus}
        onResetPassword={handleResetPassword}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {showCreateForm && (
        <UserForm
          mode="create"
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingUser && (
        <UserForm
          mode="edit"
          user={editingUser}
          onSubmit={(userData: UserCreate | UserUpdate) =>
            handleUpdateUser(editingUser.id, userData)
          }
          onCancel={() => setEditingUser(null)}
        />
      )}

      {viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={setEditingUser}
          onDelete={handleDeleteUser}
          onChangeStatus={handleChangeUserStatus}
          onResetPassword={handleResetPassword}
        />
      )}

      <style jsx>{`
        .user-management {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .user-management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .user-management-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2563eb;
        }

        @media (max-width: 768px) {
          .user-management {
            padding: 10px;
          }

          .user-management-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .user-management-header h1 {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
