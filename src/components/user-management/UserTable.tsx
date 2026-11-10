"use client";

import { User } from "@/api/generated/interfaces";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { EmptyBlock, LoadingBlock } from "@/components/redesign/states";
import { TonePill } from "@/components/redesign/pill";
import { TONE_DOT, type Tone } from "@/components/redesign/tones";
import { rdButton } from "@/components/redesign/buttons";
import { ToggleCell } from "@/components/redesign/settings";
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Eye, Pencil, RotateCw, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight, Users } from "lucide-react";

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
  onSendNewPassword: (user: User) => void;
  onToggleStaff: (userId: number, isStaff: boolean) => void;
  showStaffColumn?: boolean;
  /** Only superusers may change is_staff (POST /api/users/{id}/set-staff/). */
  canToggleStaff?: boolean;
  currentUserId?: number;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

const KNOWN_STATUS = ["active", "inactive", "pending", "suspended"];
const KNOWN_ROLES = ["admin", "manager", "agent", "viewer"];

/** Status shown in the table (an inactive account is "inactive" whatever its status field says). */
export const displayStatus = (user: User): string =>
  user.is_active ? user.status?.toString() || "active" : "inactive";

const STATUS_TONE: Record<string, Tone> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
  inactive: "neutral",
};

const displayName = (user: User) => user.full_name || `${user.first_name} ${user.last_name}`;

/**
 * Design AGENTS table (settings / users): avatar with status dot, name and
 * email; role; status; groups; staff (booking management only); row actions.
 * Same handlers and selection as before the redesign.
 */
export default function UserTable({
  users,
  loading,
  selectedUsers,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  onChangeStatus,
  onSendNewPassword,
  onToggleStaff,
  showStaffColumn = false,
  canToggleStaff = false,
  currentUserId,
  pagination,
  onPageChange,
}: UserTableProps) {
  const t = useTranslations("users");
  // Known statuses are translated; anything else is shown as sent.
  const statusLabel = (status: string) =>
    KNOWN_STATUS.includes(status.toLowerCase()) ? t(`ui.status.${status.toLowerCase()}`) : status;
  const roleLabel = (role?: string) =>
    !role ? t("ui.details.user") : KNOWN_ROLES.includes(role.toLowerCase()) ? t(`ui.roles.${role.toLowerCase()}`) : role;

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

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;

  const columns: Column<User>[] = [
    {
      id: "select",
      header: (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
          aria-label={t("ui.bulk.title")}
        />
      ),
      width: "28px",
      mobile: "end",
      cell: (user) => (
        <Checkbox
          checked={selectedUsers.includes(user.id)}
          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
          aria-label={displayName(user)}
        />
      ),
    },
    {
      id: "name",
      header: t("ui.table.name"),
      width: "minmax(0,1.6fr)",
      mobile: "title",
      cell: (user) => {
        const status = displayStatus(user).toLowerCase();
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="relative shrink-0" aria-hidden>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(displayName(user))}
              </span>
              <span
                className={cn(
                  "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-background",
                  TONE_DOT[STATUS_TONE[status] ?? "neutral"]
                )}
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{displayName(user)}</span>
              <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
              {user.job_title && <span className="truncate text-[11px] text-muted-foreground">{user.job_title}</span>}
            </span>
          </span>
        );
      },
    },
    {
      id: "role",
      header: t("role"),
      width: "110px",
      mobile: "meta",
      cell: (user) => (
        <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-xs text-foreground">
          {roleLabel(user.role?.toString())}
        </span>
      ),
    },
    {
      id: "status",
      header: t("ui.table.status"),
      width: "110px",
      mobile: "end",
      cell: (user) => {
        const status = displayStatus(user);
        const tone = STATUS_TONE[status.toLowerCase()] ?? "neutral";
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <span aria-hidden className={cn("h-[7px] w-[7px] rounded-full", TONE_DOT[tone])} />
            {statusLabel(status)}
          </span>
        );
      },
    },
    {
      id: "groups",
      header: t("ui.table.groups"),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (user) =>
        user.tenant_groups && user.tenant_groups.length > 0 ? (
          <span className="flex min-w-0 flex-wrap gap-1">
            {user.tenant_groups.map((group) => (
              <TonePill key={group.id} tone="neutral">
                <span className="truncate">{group.name}</span>
              </TonePill>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("ui.table.noGroups")}</span>
        ),
    },
    ...(showStaffColumn
      ? [
          {
            id: "staff",
            header: t("ui.table.staff"),
            width: "64px",
            align: "center" as const,
            mobile: "meta" as const,
            cell: (user: User) => (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground @3xl:hidden">{t("ui.table.staff")}</span>
                <ToggleCell
                  checked={user.is_staff || false}
                  disabled={!canToggleStaff || user.id === currentUserId}
                  onCheckedChange={(checked) => onToggleStaff(user.id, checked)}
                  label={user.is_staff ? t("ui.table.staffRemove") : t("ui.table.staffAdd")}
                />
              </span>
            ),
          },
        ]
      : []),
    {
      id: "actions",
      header: <span className="sr-only">{t("ui.table.actions")}</span>,
      width: "152px",
      align: "end",
      mobile: "actions",
      cell: (user) => (
        <span className="flex items-center gap-0.5">
          <button type="button" onClick={() => onView(user)} title={t("ui.table.view")} aria-label={t("ui.table.view")} className={rdButton.ghostIconSm}>
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onEdit(user)} title={t("ui.table.edit")} aria-label={t("ui.table.edit")} className={rdButton.ghostIconSm}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSendNewPassword(user)}
            title={t("sendNewPassword")}
            aria-label={t("sendNewPassword")}
            className={rdButton.ghostIconSm}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeStatus(user.id, user.is_active ? "inactive" : "active")}
            title={user.is_active ? t("ui.table.deactivate") : t("ui.table.activate")}
            aria-label={user.is_active ? t("ui.table.deactivate") : t("ui.table.activate")}
            className={rdButton.ghostIconSm}
          >
            {user.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(user.id)}
            title={t("ui.table.delete")}
            aria-label={t("ui.table.delete")}
            className={cn(rdButton.ghostIconSm, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      ),
    },
  ];

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

    const pageButton = (page: number) => (
      <button
        key={page}
        type="button"
        onClick={() => onPageChange(page)}
        aria-current={page === currentPage ? "page" : undefined}
        className={cn(page === currentPage ? rdButton.primarySm : rdButton.outlineSm, "min-w-7 tabular-nums")}
      >
        {page}
      </button>
    );

    return (
      <>
        {startPage > 1 && (
          <>
            {pageButton(1)}
            {startPage > 2 && <span className="px-1 text-muted-foreground">...</span>}
          </>
        )}

        {pageNumbers.map(pageButton)}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-muted-foreground">...</span>}
            {pageButton(totalPages)}
          </>
        )}
      </>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <DataTable
        variant="card"
        density="comfortable"
        columns={columns}
        rows={loading ? [] : users}
        rowKey={(user) => user.id}
        onRowClick={onView}
        isRowSelected={(user) => selectedUsers.includes(user.id)}
        rowClassName={() => "@3xl:min-h-14"}
        empty={
          loading ? (
            <LoadingBlock label={t("ui.table.loading")} testId="users-table-loading" />
          ) : (
            <EmptyBlock icon={Users} title={t("ui.table.empty")} testId="users-table-empty" />
          )
        }
        renderError={() => null}
        ariaLabel={t("userManagement")}
        idPrefix="users"
        testId="users-table"
      />

      {pagination.totalPages > 1 ? (
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center" data-testid="users-pagination">
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("ui.table.showing", {
              from: (pagination.currentPage - 1) * 20 + 1,
              to: Math.min(pagination.currentPage * 20, pagination.count),
              count: pagination.count,
            })}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={rdButton.outlineSm}
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
              {t("ui.table.previous")}
            </button>

            {renderPagination()}

            <button
              type="button"
              className={rdButton.outlineSm}
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              {t("ui.table.next")}
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        !loading &&
        users.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums" data-testid="users-count">
            {t("ui.agents.countLine", { count: pagination.count || users.length })}
          </span>
        )
      )}
    </div>
  );
}
