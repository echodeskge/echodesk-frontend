"use client";

import { User } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Eye, Pencil, RotateCw, Lock, Unlock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
  onToggleStaff: (userId: number, isStaff: boolean) => void;
  showStaffColumn?: boolean;
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
  onToggleStaff,
  showStaffColumn = false,
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
      <>
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2 text-muted-foreground">...</span>}
          </>
        )}

        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
      </>
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Email</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Groups</th>
                <th className="p-3 text-left font-semibold text-muted-foreground">Status</th>
                {showStaffColumn && (
                  <th className="p-3 text-center font-semibold text-muted-foreground">Staff</th>
                )}
                <th className="p-3 text-left font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showStaffColumn ? 7 : 6} className="p-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2">
                      <Spinner className="h-6 w-6" />
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={showStaffColumn ? 7 : 6} className="p-10 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b transition-colors hover:bg-muted/50 ${
                      selectedUsers.includes(user.id) ? "bg-muted/50" : ""
                    }`}
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) =>
                          handleSelectUser(user.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="cursor-pointer" onClick={() => onView(user)}>
                        <div className="font-medium text-foreground">
                          {user.full_name ||
                            `${user.first_name} ${user.last_name}`}
                        </div>
                        {user.job_title && (
                          <div className="text-xs text-muted-foreground mt-0.5">{user.job_title}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3">
                      {user.tenant_groups && user.tenant_groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.tenant_groups.map((group) => (
                            <Badge key={group.id} variant="secondary" className="capitalize">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No groups</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={user.is_active ? "default" : "destructive"}
                        className="capitalize"
                      >
                        {user.is_active
                          ? user.status?.toString() || "Active"
                          : "Inactive"}
                      </Badge>
                    </td>
                    {showStaffColumn && (
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={user.is_staff || false}
                          onCheckedChange={(checked) =>
                            onToggleStaff(user.id, checked as boolean)
                          }
                          title={user.is_staff ? "Remove from booking staff" : "Add to booking staff"}
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(user)}
                          title="View Details"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(user)}
                          title="Edit User"
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onResetPassword(user.id)}
                          title="Reset Password"
                          className="h-8 w-8 p-0"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onChangeStatus(
                              user.id,
                              user.is_active ? "inactive" : "active"
                            )
                          }
                          title={user.is_active ? "Deactivate" : "Activate"}
                          className="h-8 w-8 p-0"
                        >
                          {user.is_active ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(user.id)}
                          title="Delete User"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {pagination.totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.currentPage - 1) * 20 + 1} to{" "}
            {Math.min(pagination.currentPage * 20, pagination.count)} of{" "}
            {pagination.count} users
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {renderPagination()}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
