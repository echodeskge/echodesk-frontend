"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  UserCreate,
  PaginatedUserList,
  UserUpdate,
} from "@/api/generated/interfaces";
import { usersPartialUpdate, usersSendNewPasswordCreate, usersSetStaffCreate, bookingsAdminStaffCreate, usersBulkActionCreate } from "@/api/generated/api";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, userKeys } from "@/hooks/api/useUsers";
import { getApiErrorMessage } from "@/lib/utils";

import UserTable from "./user-management/UserTable";
import UserBulkActions from "./user-management/UserBulkActions";
import UserForm from "./user-management/UserForm";
import UserDetailsModal from "./user-management/UserDetailsModal";
import UserFilters from "./user-management/UserFilters";
import SendPasswordModal from "./user-management/SendPasswordModal";
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
  const queryClient = useQueryClient();
  // The profile payload carries is_superuser even though the generated User
  // type does not declare it.
  const isSuperuser = Boolean(
    (currentUserProfile as { is_superuser?: boolean } | undefined)?.is_superuser
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSendPasswordModal, setShowSendPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [sendPasswordLoading, setSendPasswordLoading] = useState(false);
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
    } catch (err: unknown) {
      throw new Error(getApiErrorMessage(err, "Failed to create user"));
    }
  };

  const handleUpdateUser = async (
    userId: number,
    userData: UserCreate | UserUpdate
  ) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, data: userData as UserUpdate });
      setEditingUser(null);
    } catch (err: unknown) {
      throw new Error(getApiErrorMessage(err, "Failed to update user"));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(t("areYouSureDelete"))) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(userId);
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, tCommon("error")));
    }
  };

  const handleChangeUserStatus = async (userId: number, status: string) => {
    try {
      await usersPartialUpdate(userId, { status: status as any });
      // React Query will auto-invalidate and refetch
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, "Failed to change user status"));
    }
  };

  const handleOpenSendPasswordModal = (user: User) => {
    setSelectedUserForPassword(user);
    setShowSendPasswordModal(true);
  };

  const handleSendNewPassword = async () => {
    if (!selectedUserForPassword) return;

    setSendPasswordLoading(true);
    try {
      await usersSendNewPasswordCreate(selectedUserForPassword.id);
      alert(t("sendNewPasswordSuccess"));
      setShowSendPasswordModal(false);
      setSelectedUserForPassword(null);
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, tCommon("error")));
    } finally {
      setSendPasswordLoading(false);
    }
  };

  const handleToggleStaff = async (userId: number, isStaff: boolean) => {
    try {
      // is_staff is no longer writable through PATCH /api/users/{id}/; the
      // dedicated superuser-only endpoint is the only way to change it.
      await usersSetStaffCreate(userId, { is_staff: isStaff });

      if (isStaff) {
        // Create BookingStaff record when enabling staff
        try {
          await bookingsAdminStaffCreate({
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

    } catch (err: unknown) {
      alert(getApiErrorMessage(err, "Failed to toggle staff status"));
    } finally {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
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

      const result = await usersBulkActionCreate(bulkActionData);
      setSelectedUsers([]);
      // The backend skips users the caller may not touch (higher privileges,
      // superusers, themselves) and reports them instead of failing.
      const skipped = result?.skipped_user_ids || [];
      if (skipped.length > 0) {
        alert(
          t("bulkActionPartial", {
            affected: result?.affected ?? 0,
            skipped: skipped.length,
          })
        );
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, "Bulk action failed"));
    } finally {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
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
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
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
        onSendNewPassword={handleOpenSendPasswordModal}
        onToggleStaff={handleToggleStaff}
        showStaffColumn={hasBookingManagement}
        canToggleStaff={isSuperuser}
        currentUserId={currentUserProfile?.id}
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
          onSendNewPassword={handleOpenSendPasswordModal}
        />
      )}

      {/* Send Password Modal */}
      <SendPasswordModal
        isOpen={showSendPasswordModal}
        onClose={() => {
          setShowSendPasswordModal(false);
          setSelectedUserForPassword(null);
        }}
        onConfirm={handleSendNewPassword}
        userName={selectedUserForPassword?.full_name || `${selectedUserForPassword?.first_name || ''} ${selectedUserForPassword?.last_name || ''}`.trim() || ''}
        userEmail={selectedUserForPassword?.email || ''}
        isLoading={sendPasswordLoading}
      />
    </div>
  );
}
