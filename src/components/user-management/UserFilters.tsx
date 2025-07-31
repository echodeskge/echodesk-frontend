"use client";

import { useState } from "react";
import type { UserFilters } from "../UserManagement";

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
    { value: "", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "agent", label: "Agent" },
    { value: "viewer", label: "Viewer" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
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
    <div className="user-filters">
      <div className="filters-main">
        <div className="search-group">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={filters.role}
            onChange={(e) => onFiltersChange({ role: e.target.value })}
            className="filter-select"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value })}
            className="filter-select"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Less Filters" : "More Filters"}
          </button>

          {hasActiveFilters() && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={clearFilters}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="filters-advanced">
          <div className="advanced-grid">
            <div className="filter-group">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                placeholder="Filter by department"
                value={filters.department}
                onChange={(e) =>
                  onFiltersChange({ department: e.target.value })
                }
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="isActive">Account Status</label>
              <select
                id="isActive"
                value={
                  filters.isActive === null ? "" : filters.isActive.toString()
                }
                onChange={(e) =>
                  onFiltersChange({
                    isActive:
                      e.target.value === "" ? null : e.target.value === "true",
                  })
                }
                className="filter-select"
              >
                <option value="">All Accounts</option>
                <option value="true">Active Accounts</option>
                <option value="false">Inactive Accounts</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="isStaff">Staff Status</label>
              <select
                id="isStaff"
                value={
                  filters.isStaff === null ? "" : filters.isStaff.toString()
                }
                onChange={(e) =>
                  onFiltersChange({
                    isStaff:
                      e.target.value === "" ? null : e.target.value === "true",
                  })
                }
                className="filter-select"
              >
                <option value="">All Users</option>
                <option value="true">Staff Members</option>
                <option value="false">Regular Users</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters() && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          <div className="active-filters-list">
            {filters.search && (
              <span className="filter-tag">
                Search: &quot;{filters.search}&quot;
                <button onClick={() => onFiltersChange({ search: "" })}>
                  ×
                </button>
              </span>
            )}
            {filters.role && (
              <span className="filter-tag">
                Role: {roleOptions.find((r) => r.value === filters.role)?.label}
                <button onClick={() => onFiltersChange({ role: "" })}>×</button>
              </span>
            )}
            {filters.status && (
              <span className="filter-tag">
                Status:{" "}
                {statusOptions.find((s) => s.value === filters.status)?.label}
                <button onClick={() => onFiltersChange({ status: "" })}>
                  ×
                </button>
              </span>
            )}
            {filters.department && (
              <span className="filter-tag">
                Department: {filters.department}
                <button onClick={() => onFiltersChange({ department: "" })}>
                  ×
                </button>
              </span>
            )}
            {filters.isActive !== null && (
              <span className="filter-tag">
                Account: {filters.isActive ? "Active" : "Inactive"}
                <button onClick={() => onFiltersChange({ isActive: null })}>
                  ×
                </button>
              </span>
            )}
            {filters.isStaff !== null && (
              <span className="filter-tag">
                Staff: {filters.isStaff ? "Yes" : "No"}
                <button onClick={() => onFiltersChange({ isStaff: null })}>
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .user-filters {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .filters-main {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .search-group {
          flex: 1;
          min-width: 250px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .search-input,
        .filter-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          min-width: 150px;
          transition: border-color 0.2s;
        }

        .search-input {
          min-width: 250px;
        }

        .search-input:focus,
        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-outline:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .filters-advanced {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .advanced-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .active-filters {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .active-filters-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .active-filters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background-color: #dbeafe;
          color: #1e40af;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .filter-tag button {
          background: none;
          border: none;
          color: #1e40af;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          padding: 0;
          margin-left: 2px;
          line-height: 1;
        }

        .filter-tag button:hover {
          color: #1e3a8a;
        }

        @media (max-width: 768px) {
          .filters-main {
            flex-direction: column;
            align-items: stretch;
          }

          .search-group {
            min-width: auto;
          }

          .search-input {
            min-width: auto;
          }

          .filter-group {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .advanced-grid {
            grid-template-columns: 1fr;
          }

          .active-filters {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
