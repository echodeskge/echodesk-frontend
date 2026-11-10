"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { UserFilters } from "../UserManagement";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rdButton } from "@/components/redesign/buttons";
import { settingsInputClass } from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
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

  // A removable chip of the active filters row.
  const chip = (key: string, text: string, onRemove: () => void) => (
    <span
      key={key}
      className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border bg-muted/60 ps-2.5 pe-1 text-xs"
    >
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("ui.agents.removeFilter")}
        title={t("ui.agents.removeFilter")}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );

  const trigger = "h-8 text-[13px]";

  return (
    <div className="flex min-w-0 flex-col gap-2.5" data-testid="users-filters">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 basis-[240px]">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            placeholder={t("ui.filters.search")}
            aria-label={t("ui.filters.search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(settingsInputClass, "h-8 ps-8")}
          />
        </div>

        {/* Role Filter */}
        <Select
          value={filters.role || "all"}
          onValueChange={(value) => onFiltersChange({ role: value === "all" ? "" : value })}
        >
          <SelectTrigger className={cn(trigger, "w-[calc(50%-4px)] sm:w-[160px]")} aria-label={t("ui.filters.allRoles")}>
            <SelectValue placeholder={t("ui.filters.allRoles")} />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => onFiltersChange({ status: value === "all" ? "" : value })}
        >
          <SelectTrigger className={cn(trigger, "w-[calc(50%-4px)] sm:w-[160px]")} aria-label={t("ui.filters.allStatus")}>
            <SelectValue placeholder={t("ui.filters.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Actions */}
        <button
          type="button"
          className={cn(rdButton.outline, showAdvanced && "bg-accent")}
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-label={t("ui.agents.moreFilters")}
          title={t("ui.agents.moreFilters")}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        </button>

        {hasActiveFilters() && (
          <button type="button" className={rdButton.outline} onClick={clearFilters}>
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("ui.filters.clear")}
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 rounded-[10px] border bg-muted/20 p-3.5 md:grid-cols-3" data-testid="users-advanced-filters">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="department" className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">
              {t("ui.filters.department")}
            </Label>
            <input
              type="text"
              id="department"
              placeholder={t("ui.filters.departmentPlaceholder")}
              value={filters.department}
              onChange={(e) => onFiltersChange({ department: e.target.value })}
              className={settingsInputClass}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="isActive" className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">
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
              <SelectTrigger id="isActive" className="h-[34px] text-[13px]">
                <SelectValue placeholder={t("ui.filters.allAccounts")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ui.filters.allAccounts")}</SelectItem>
                <SelectItem value="true">{t("ui.filters.activeAccounts")}</SelectItem>
                <SelectItem value="false">{t("ui.filters.inactiveAccounts")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="isStaff" className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">
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
              <SelectTrigger id="isStaff" className="h-[34px] text-[13px]">
                <SelectValue placeholder={t("ui.filters.allUsers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ui.filters.allUsers")}</SelectItem>
                <SelectItem value="true">{t("ui.filters.staffMembers")}</SelectItem>
                <SelectItem value="false">{t("ui.filters.regularUsers")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters() && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid="users-active-filters">
          <span className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">
            {t("ui.filters.active")}
          </span>
          {filters.search &&
            chip("search", `${t("ui.filters.chipSearch")}: "${filters.search}"`, () => onFiltersChange({ search: "" }))}
          {filters.role &&
            chip("role", `${t("ui.filters.chipRole")}: ${roleOptions.find((r) => r.value === filters.role)?.label}`, () =>
              onFiltersChange({ role: "" })
            )}
          {filters.status &&
            chip("status", `${t("ui.filters.chipStatus")}: ${statusOptions.find((s) => s.value === filters.status)?.label}`, () =>
              onFiltersChange({ status: "" })
            )}
          {filters.department &&
            chip("department", `${t("ui.filters.department")}: ${filters.department}`, () => onFiltersChange({ department: "" }))}
          {filters.isActive !== null &&
            chip(
              "isActive",
              `${t("ui.filters.chipAccount")}: ${filters.isActive ? t("ui.status.active") : t("ui.status.inactive")}`,
              () => onFiltersChange({ isActive: null })
            )}
          {filters.isStaff !== null &&
            chip("isStaff", `${t("ui.table.staff")}: ${filters.isStaff ? t("ui.yes") : t("ui.no")}`, () =>
              onFiltersChange({ isStaff: null })
            )}
        </div>
      )}
    </div>
  );
}
