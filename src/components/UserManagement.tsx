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
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, userKeys, type UserListFilters } from "@/hooks/api/useUsers";
import { getApiErrorMessage } from "@/lib/utils";
import {
  formatBulkBlocked,
  formatRemovalBlocked,
  removalBlockedReasons,
  type RemovalReasonCode,
} from "./user-management/removalBlocked";
import { toast } from "sonner";

import UserTable from "./user-management/UserTable";
import UserBulkActions from "./user-management/UserBulkActions";
import UserForm from "./user-management/UserForm";
import UserDetailsModal from "./user-management/UserDetailsModal";
import UserFilters from "./user-management/UserFilters";
import SendPasswordModal from "./user-management/SendPasswordModal";
import { SettingsPage, ListActionButton, SettingsNote } from "@/components/redesign/settings";
import { LoadingBlock } from "@/components/redesign/states";
import { UserPlus, Users } from "lucide-react";

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
  // Leave-guard reasons arrive with codes (open_requests, covering, ...).
  const translateReason = ({ code, count }: RemovalReasonCode): string | null =>
    ["open_requests", "covering", "manager_of", "has_history"].includes(code)
      ? t(`ui.removalReasons.${code}`, { count: count ?? 0 })
      : null;
  // A blocked deactivation/delete shows a toast with the reasons; other errors too.
  const showRemovalError = (err: unknown, fallback: string) => {
    const reasons = removalBlockedReasons(err, translateReason);
    if (reasons !== null) {
      toast.error(t("removalBlocked"), {
        description: (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        ),
        duration: 8000,
      });
      return;
    }
    toast.error(getApiErrorMessage(err, fallback));
  };
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
  // role / status / account / staff go to the API (department is a free-text
  // input while the API filters by department id, so it is not sent).
  const { data: usersData, isLoading: loading, error: queryError } = useUsers({
    page: currentPage,
    search: filters.search || undefined,
    filters: {
      role: (filters.role || undefined) as UserListFilters["role"],
      status: (filters.status || undefined) as UserListFilters["status"],
      isActive: filters.isActive,
      isStaff: filters.isStaff,
    },
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
      throw new Error(getApiErrorMessage(err, t("ui.errors.create")));
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
      throw new Error(
        formatRemovalBlocked(err, t("removalBlocked"), translateReason) ||
          getApiErrorMessage(err, t("ui.errors.update"))
      );
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(t("areYouSureDelete"))) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(userId);
    } catch (err: unknown) {
      showRemovalError(err, tCommon("error"));
    }
  };

  const handleChangeUserStatus = async (userId: number, status: string) => {
    try {
      await usersPartialUpdate(userId, { status: status as any });
      // React Query will auto-invalidate and refetch
    } catch (err: unknown) {
      showRemovalError(err, t("ui.errors.status"));
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
      alert(getApiErrorMessage(err, t("ui.errors.staff")));
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
      // Users held back by open leave work are listed with their reasons;
      // they are also part of skipped_user_ids.
      const { blocked, blocked_codes: blockedCodes } = (result ?? {}) as {
        blocked?: Record<string, string[]>;
        blocked_codes?: Record<string, RemovalReasonCode[]>;
      };
      const blockedLines = formatBulkBlocked(
        blocked,
        (id) => {
          const u = users.find((row) => row.id === id);
          return u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email : `#${id}`;
        },
        blockedCodes,
        translateReason
      );
      const otherSkipped = skipped.length - blockedLines.length;
      const messages: string[] = [];
      if (otherSkipped > 0) {
        messages.push(
          t("bulkActionPartial", {
            affected: result?.affected ?? 0,
            skipped: otherSkipped,
          })
        );
      }
      if (blockedLines.length > 0) {
        messages.push([t("bulkBlocked", { count: blockedLines.length }), ...blockedLines].join("\n"));
      }
      if (messages.length > 0) alert(messages.join("\n\n"));
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, t("ui.errors.bulk")));
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

  const header = {
    icon: Users,
    title: t("userManagement"),
    description: t("ui.subtitle"),
    width: "wide" as const,
    gap: 16 as const,
    testId: "settings-users",
    action: (
      <ListActionButton
        action={{ label: t("addUser"), icon: UserPlus, onClick: () => setShowCreateForm(true), testId: "users-add" }}
      />
    ),
  };

  if (loading && users.length === 0) {
    return (
      <SettingsPage {...header}>
        <LoadingBlock label={tCommon("loading")} className="min-h-[300px]" testId="users-loading" />
      </SettingsPage>
    );
  }

  // Design AGENTS stat strip, from the list already loaded (no extra call):
  // the total is the API count; active / inactive count the rows on this page.
  const activeOnPage = users.filter((u) => u.is_active).length;
  const pageHint = pagination.totalPages > 1 ? t("ui.agents.onThisPage") : undefined;
  const stats = [
    { key: "total", label: t("ui.agents.statTotal"), value: pagination.count },
    { key: "active", label: t("ui.agents.statActive"), value: activeOnPage, hint: pageHint },
    { key: "inactive", label: t("ui.agents.statInactive"), value: users.length - activeOnPage, hint: pageHint },
  ];

  return (
    <SettingsPage {...header}>
      {/* Error Alert */}
      {error && <SettingsNote tone="danger">{error}</SettingsNote>}

      <div className="grid grid-cols-3 gap-2.5" data-testid="users-stats">
        {stats.map((c) => (
          <div key={c.key} className="flex min-w-0 flex-col gap-0.5 rounded-[10px] border px-3.5 py-3" data-testid={`users-stat-${c.key}`}>
            <span className="truncate text-[11px] text-muted-foreground" title={c.label}>
              {c.label}
            </span>
            <span className="text-xl font-semibold leading-6 tabular-nums tracking-[-.02em]">{c.value}</span>
            {c.hint && <span className="truncate text-[11px] text-muted-foreground">{c.hint}</span>}
          </div>
        ))}
      </div>

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
    </SettingsPage>
  );
}
