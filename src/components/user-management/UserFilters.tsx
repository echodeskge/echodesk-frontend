"use client";

import { useState } from "react";
import type { UserFilters } from "../UserManagement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: Partial<UserFilters>) => void;
}

export default function UserFilters({
  filters,
  onFiltersChange,
}: UserFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "agent", label: "Agent" },
    { value: "viewer", label: "Viewer" },
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
  ];

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      role: "",
      status: "",
      department: "",
      isActive: null,
      isStaff: null,
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.role ||
      filters.status ||
      filters.department ||
      filters.isActive !== null ||
      filters.isStaff !== null
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="space-y-1">
            <Select
              value={filters.role || "all"}
              onValueChange={(value) => onFiltersChange({ role: value === "all" ? "" : value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => onFiltersChange({ status: value === "all" ? "" : value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvanced ? (
                <>
                  <ChevronUp className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>

            {hasActiveFilters() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs uppercase text-muted-foreground">
                  Department
                </Label>
                <Input
                  type="text"
                  id="department"
                  placeholder="Filter by department"
                  value={filters.department}
                  onChange={(e) => onFiltersChange({ department: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive" className="text-xs uppercase text-muted-foreground">
                  Account Status
                </Label>
                <Select
                  value={filters.isActive === null ? "all" : filters.isActive.toString()}
                  onValueChange={(value) =>
                    onFiltersChange({
                      isActive: value === "all" ? null : value === "true",
                    })
                  }
                >
                  <SelectTrigger id="isActive">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    <SelectItem value="all">All Accounts</SelectItem>
                    <SelectItem value="true">Active Accounts</SelectItem>
                    <SelectItem value="false">Inactive Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isStaff" className="text-xs uppercase text-muted-foreground">
                  Staff Status
                </Label>
                <Select
                  value={filters.isStaff === null ? "all" : filters.isStaff.toString()}
                  onValueChange={(value) =>
                    onFiltersChange({
                      isStaff: value === "all" ? null : value === "true",
                    })
                  }
                >
                  <SelectTrigger id="isStaff">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="true">Staff Members</SelectItem>
                    <SelectItem value="false">Regular Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters() && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Active filters:
            </span>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: &quot;{filters.search}&quot;
                  <button
                    onClick={() => onFiltersChange({ search: "" })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.role && (
                <Badge variant="secondary" className="gap-1">
                  Role: {roleOptions.find((r) => r.value === filters.role)?.label}
                  <button
                    onClick={() => onFiltersChange({ role: "" })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusOptions.find((s) => s.value === filters.status)?.label}
                  <button
                    onClick={() => onFiltersChange({ status: "" })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.department && (
                <Badge variant="secondary" className="gap-1">
                  Department: {filters.department}
                  <button
                    onClick={() => onFiltersChange({ department: "" })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.isActive !== null && (
                <Badge variant="secondary" className="gap-1">
                  Account: {filters.isActive ? "Active" : "Inactive"}
                  <button
                    onClick={() => onFiltersChange({ isActive: null })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.isStaff !== null && (
                <Badge variant="secondary" className="gap-1">
                  Staff: {filters.isStaff ? "Yes" : "No"}
                  <button
                    onClick={() => onFiltersChange({ isStaff: null })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
