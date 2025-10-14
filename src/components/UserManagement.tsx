"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  UserCreate,
  PaginatedUserList,
  UserUpdate,
} from "@/api/generated/interfaces";
import * as api from "@/api/generated/api";

import UserTable from "./user-management/UserTable";
import UserBulkActions from "./user-management/UserBulkActions";
import UserForm from "./user-management/UserForm";
import UserDetailsModal from "./user-management/UserDetailsModal";
import UserFilters from "./user-management/UserFilters";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Plus, XCircle } from "lucide-react";

export interface UserFilters {
  search: string;
  role: string;
  status: string;
  department: string;
  isActive: boolean | null;
  isStaff: boolean | null;
}

export default function UserManagement() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
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
    if (!confirm(t("areYouSureDelete"))) {
      return;
    }

    try {
      await api.usersDestroy(userId);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      alert(
        err.response?.data?.detail || err.message || tCommon("error")
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
        t("areYouSureResetPassword")
      )
    ) {
      return;
    }

    try {
      await api.usersChangePasswordCreate(userId, {} as User);
      alert(t("passwordResetSent"));
    } catch (err: any) {
      alert(
        err.response?.data?.detail || err.message || tCommon("error")
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Spinner className="h-8 w-8" />
          <span className="text-muted-foreground">{tCommon("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("userManagement")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addUser")}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <UserFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <UserBulkActions
          selectedCount={selectedUsers.length}
          onBulkAction={handleBulkAction}
          selectedUsers={selectedUsers}
        />
      )}

      {/* Users Table */}
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

      {/* Create Form Dialog */}
      <UserForm
        mode="create"
        open={showCreateForm}
        onSubmit={handleCreateUser}
        onClose={() => setShowCreateForm(false)}
      />

      {/* Edit Form Dialog */}
      <UserForm
        mode="edit"
        user={editingUser || undefined}
        open={editingUser !== null}
        onSubmit={(userData: UserCreate | UserUpdate) =>
          editingUser ? handleUpdateUser(editingUser.id, userData) : Promise.resolve()
        }
        onClose={() => setEditingUser(null)}
      />

      {/* User Details Modal */}
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
    </div>
  );
}
