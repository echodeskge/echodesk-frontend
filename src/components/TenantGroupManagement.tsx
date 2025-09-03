"use client";

import React, { useState, useEffect } from 'react';
import { TenantGroup, TenantGroupCreate, PaginatedTenantGroupList } from '../api/generated/interfaces';
import { tenantGroupsList, tenantGroupsCreate, tenantGroupsPartialUpdate, tenantGroupsDestroy } from '../api/generated/api';
import { PERMISSION_CATEGORIES } from '@/services/permissionService';

interface TenantGroupFormData extends Omit<TenantGroupCreate, 'name' | 'description'> {
  name: string;
  description: string;
}

interface TenantGroupFormProps {
  mode: 'create' | 'edit';
  group?: TenantGroup;
  onSubmit: (data: TenantGroupFormData) => Promise<void>;
  onCancel: () => void;
}

const TenantGroupForm: React.FC<TenantGroupFormProps> = ({ mode, group, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<TenantGroupFormData>({
    name: group?.name || '',
    description: group?.description || '',
    can_view_all_tickets: group?.can_view_all_tickets || false,
    can_manage_users: group?.can_manage_users || false,
    can_make_calls: group?.can_make_calls || false,
    can_manage_groups: group?.can_manage_groups || false,
    can_manage_settings: group?.can_manage_settings || false,
    can_create_tickets: group?.can_create_tickets || true, // Default to true
    can_edit_own_tickets: group?.can_edit_own_tickets || true, // Default to true
    can_edit_all_tickets: group?.can_edit_all_tickets || false,
    can_delete_tickets: group?.can_delete_tickets || false,
    can_assign_tickets: group?.can_assign_tickets || false,
    can_view_reports: group?.can_view_reports || false,
    can_export_data: group?.can_export_data || false,
    can_manage_tags: group?.can_manage_tags || false,
    can_manage_columns: group?.can_manage_columns || false,
    can_view_boards: group?.can_view_boards || true, // Default to true
    can_create_boards: group?.can_create_boards || false,
    can_edit_boards: group?.can_edit_boards || false,
    can_delete_boards: group?.can_delete_boards || false,
    can_access_orders: group?.can_access_orders || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Map permission categories to form fields
  const permissionCategoryMapping = {
    'tickets': [
      'can_create_tickets',
      'can_edit_own_tickets', 
      'can_edit_all_tickets',
      'can_delete_tickets',
      'can_assign_tickets',
      'can_manage_tags',
      'can_manage_columns',
      'can_view_all_tickets'
    ],
    'orders': ['can_access_orders'],
    'calls': ['can_make_calls'],
    'user_management': ['can_manage_users', 'can_manage_groups', 'can_manage_settings'],
    'boards': ['can_view_boards', 'can_create_boards', 'can_edit_boards', 'can_delete_boards'],
    'reports': ['can_view_reports', 'can_export_data'],
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const permissions = permissionCategoryMapping[categoryId as keyof typeof permissionCategoryMapping];
    if (!permissions) return;

    setFormData(prev => {
      const updated = { ...prev };
      permissions.forEach(permission => {
        (updated as any)[permission] = checked;
      });
      return updated;
    });
  };

  const isCategoryChecked = (categoryId: string) => {
    const permissions = permissionCategoryMapping[categoryId as keyof typeof permissionCategoryMapping];
    if (!permissions) return false;
    
    return permissions.some(permission => (formData as any)[permission] === true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save group" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "white",
        borderRadius: "12px",
        padding: "24px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        <h2 style={{ margin: "0 0 20px 0" }}>
          {mode === "create" ? "Create New Group" : "Edit Group"}
        </h2>

        {errors.submit && (
          <div style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "14px",
          }}>
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
              }}
              required
              disabled={isSubmitting}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                resize: "vertical",
                minHeight: "80px",
              }}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
              Permissions
            </label>
            
            <div style={{ display: "grid", gap: "16px" }}>
              {PERMISSION_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  style={{
                    border: "1px solid #dee2e6",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    marginBottom: "8px",
                  }}>
                    <input
                      type="checkbox"
                      checked={isCategoryChecked(category.id)}
                      onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                      disabled={isSubmitting}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "16px" }}>
                        {category.label}
                      </div>
                      <div style={{ fontSize: "14px", color: "#6c757d" }}>
                        {category.description}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            paddingTop: "20px",
            borderTop: "1px solid #dee2e6",
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                background: "#6c757d",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Group" : "Update Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantGroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: TenantGroup } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: PaginatedTenantGroupList = await tenantGroupsList();
      setGroups(response.results);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (data: TenantGroupFormData) => {
    await tenantGroupsCreate(data as TenantGroupCreate);
    setShowForm(null);
    await loadGroups();
  };

  const handleUpdateGroup = async (data: TenantGroupFormData) => {
    if (!showForm?.group) return;
    await tenantGroupsPartialUpdate(showForm.group.id, data);
    setShowForm(null);
    await loadGroups();
  };

  const handleDeleteGroup = async (group: TenantGroup) => {
    if (window.confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      try {
        await tenantGroupsDestroy(group.id);
        await loadGroups();
      } catch (err: any) {
        setError(err.message || "Failed to delete group");
      }
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>Loading groups...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}>
        <h1 style={{ margin: 0 }}>Group Management</h1>
        <button
          onClick={() => setShowForm({ mode: 'create' })}
          style={{
            background: "#28a745",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Create New Group
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "10px",
            border: "1px solid #dee2e6",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>

      {error && (
        <div style={{
          background: "#f8d7da",
          color: "#721c24",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: "white",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        {filteredGroups.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6c757d" }}>
            {searchTerm ? "No groups match your search." : "No groups found. Create your first group to get started."}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.id}
              style={{
                padding: "16px",
                borderBottom: "1px solid #dee2e6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "4px" }}>
                  {group.name}
                </div>
                {group.description && (
                  <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>
                    {group.description}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#6c757d" }}>
                  {group.member_count} members • Created {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowForm({ mode: 'edit', group })}
                  style={{
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteGroup(group)}
                  style={{
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <TenantGroupForm
          mode={showForm.mode}
          group={showForm.group}
          onSubmit={showForm.mode === 'create' ? handleCreateGroup : handleUpdateGroup}
          onCancel={() => setShowForm(null)}
        />
      )}
    </div>
  );
};

export default TenantGroupManagement;