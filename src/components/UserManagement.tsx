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
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/api/useUsers";

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
  const { data: currentUserProfile } = useUserProfile();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "",
    status: "",
    department: "",
    isActive: null,
    isStaff: null,
  });

  // Use React Query hook for users
  const { data: usersData, isLoading: loading, error: queryError } = useUsers({
    page: currentPage,
    search: filters.search || undefined,
  });

  const users = usersData?.results || [];
  const error = queryError ? (queryError as Error).message : "";
  const pagination = {
    count: usersData?.count || 0,
    next: usersData?.next || null,
    previous: usersData?.previous || null,
    currentPage,
    totalPages: Math.ceil((usersData?.count || 0) / 20), // Assuming 20 items per page
  };

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const handleCreateUser = async (userData: UserCreate | UserUpdate) => {
    try {
      await createUserMutation.mutateAsync(userData as UserCreate);
      setShowCreateForm(false);
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
      await updateUserMutation.mutateAsync({ id: userId, data: userData as UserUpdate });
      setEditingUser(null);
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
      await deleteUserMutation.mutateAsync(userId);
    } catch (err: any) {
      alert(
        err.response?.data?.detail || err.message || tCommon("error")
      );
    }
  };

  const handleChangeUserStatus = async (userId: number, status: string) => {
    try {
      await api.usersPartialUpdate(userId, { status: status as any });
      // React Query will auto-invalidate and refetch
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

  const handleToggleStaff = async (userId: number, isStaff: boolean) => {
    try {
      // Update user's is_staff field
      await api.usersPartialUpdate(userId, { is_staff: isStaff } as any);

      if (isStaff) {
        // Create BookingStaff record when enabling staff
        try {
          await api.bookingsAdminStaffCreate({
            user_id: userId,
            is_active_for_bookings: true,
          } as any);
        } catch (staffErr: any) {
          // If staff record already exists, that's fine
          if (staffErr.response?.status !== 400) {
            throw staffErr;
          }
        }
      }

      // React Query will auto-invalidate and refetch
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
          err.message ||
          "Failed to toggle staff status"
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
      // React Query will auto-invalidate and refetch
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || "Bulk action failed");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFiltersChange = (newFilters: Partial<UserFilters>) => {
    setFilters((prev: UserFilters) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page
  };

  // Check if user has booking management feature
  const userFeatureKeys = currentUserProfile?.feature_keys
    ? typeof currentUserProfile.feature_keys === "string"
      ? JSON.parse(currentUserProfile.feature_keys)
      : currentUserProfile.feature_keys
    : [];
  const hasBookingManagement = userFeatureKeys.includes('booking_management');

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
        onToggleStaff={handleToggleStaff}
        showStaffColumn={hasBookingManagement}
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
