"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("users");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync input when filters are cleared externally
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
  }, [filters.search]);

  const roleOptions = [
    { value: "all", label: t("ui.filters.allRoles") },
    { value: "admin", label: t("ui.roles.admin") },
    { value: "manager", label: t("ui.roles.manager") },
    { value: "agent", label: t("ui.roles.agent") },
    { value: "viewer", label: t("ui.roles.viewer") },
  ];

  const statusOptions = [
    { value: "all", label: t("ui.filters.allStatus") },
    { value: "active", label: t("ui.status.active") },
    { value: "inactive", label: t("ui.status.inactive") },
    { value: "pending", label: t("ui.status.pending") },
    { value: "suspended", label: t("ui.status.suspended") },
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
                placeholder={t("ui.filters.search")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("ui.filters.allRoles")} />
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
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("ui.filters.allStatus")} />
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
                {t("ui.filters.clear")}
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
                  {t("ui.filters.department")}
                </Label>
                <Input
                  type="text"
                  id="department"
                  placeholder={t("ui.filters.departmentPlaceholder")}
                  value={filters.department}
                  onChange={(e) => onFiltersChange({ department: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive" className="text-xs uppercase text-muted-foreground">
                  {t("ui.filters.accountStatus")}
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
                    <SelectValue placeholder={t("ui.filters.allAccounts")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    <SelectItem value="all">{t("ui.filters.allAccounts")}</SelectItem>
                    <SelectItem value="true">{t("ui.filters.activeAccounts")}</SelectItem>
                    <SelectItem value="false">{t("ui.filters.inactiveAccounts")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isStaff" className="text-xs uppercase text-muted-foreground">
                  {t("ui.filters.staffStatus")}
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
                    <SelectValue placeholder={t("ui.filters.allUsers")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    <SelectItem value="all">{t("ui.filters.allUsers")}</SelectItem>
                    <SelectItem value="true">{t("ui.filters.staffMembers")}</SelectItem>
                    <SelectItem value="false">{t("ui.filters.regularUsers")}</SelectItem>
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
              {t("ui.filters.active")}
            </span>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  {t("ui.filters.chipSearch")}: &quot;{filters.search}&quot;
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
                  {t("ui.filters.chipRole")}: {roleOptions.find((r) => r.value === filters.role)?.label}
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
                  {t("ui.filters.chipStatus")}: {statusOptions.find((s) => s.value === filters.status)?.label}
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
                  {t("ui.filters.department")}: {filters.department}
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
                  {t("ui.filters.chipAccount")}: {filters.isActive ? t("ui.status.active") : t("ui.status.inactive")}
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
                  {t("ui.table.staff")}: {filters.isStaff ? t("ui.yes") : t("ui.no")}
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
