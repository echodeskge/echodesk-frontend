import React, { useState, useEffect } from 'react';
import { Group, GroupCreate, PaginatedGroupList, PatchedGroup, Permission, PaginatedPermissionList } from '../api/generated/interfaces';
import { groupsList, groupsCreate, groupsPartialUpdate, groupsDestroy, permissionsList } from '../api/generated/api';
import './GroupManagement.css';

interface GroupFormData {
  name: string;
  permission_ids: number[];
}

interface ExtendedGroup extends Group {
  [key: string]: any; // Allow for permission fields
}

interface GroupFormProps {
  mode: 'create' | 'edit';
  group?: ExtendedGroup;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onCancel: () => void;
  permissions: Permission[];
  permissionSearch: string;
  setPermissionSearch: (search: string) => void;
}

// Helper function to format permission name like Django admin
const formatPermissionName = (permission: Permission) => {
  return `${permission.app_label} | ${permission.model} | ${permission.name}`;
};

const GroupForm: React.FC<GroupFormProps> = ({ mode, group, onSubmit, onCancel, permissions, permissionSearch, setPermissionSearch }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: group?.name || '',
    permission_ids: group?.permissions?.map(p => p.id) || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update form data when group prop changes
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        permission_ids: group.permissions?.map(p => p.id) || [],
      });
    }
  }, [group]);

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

  const handleChange = (field: string, value: string | number[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    const updatedPermissionIds = formData.permission_ids.includes(permissionId)
      ? formData.permission_ids.filter(id => id !== permissionId)
      : [...formData.permission_ids, permissionId];
    handleChange('permission_ids', updatedPermissionIds);
  };

  return (
    <div className="group-form-overlay">
      <div className="group-form-modal">
        <div className="group-form-header">
          <h2>{mode === "create" ? "Create New Group" : "Edit Group"}</h2>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <form className="group-form" onSubmit={handleSubmit}>
          {errors.submit && <div className="error-alert">{errors.submit}</div>}

          <div className="form-group">
            <label htmlFor="name">Group Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={errors.name ? "error" : ""}
              placeholder="Enter group name"
              required
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="permissions-section">
            <h3>Group Permissions</h3>
            <p>Select the permissions that members of this group will have:</p>
            
            <div className="permissions-search">
              <input
                type="text"
                placeholder="Search permissions..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="permissions-count">
              Showing {permissions.length} permissions
              {permissionSearch && ` (filtered)`}
            </div>
            
            {permissions.length === 0 ? (
              <div>Loading permissions...</div>
            ) : (
              <div className="permissions-grid">
                {permissions.map((permission) => (
                  <div key={permission.id} className="permission-item">
                    <label className="permission-label">
                      <input
                        type="checkbox"
                        checked={formData.permission_ids.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                      />
                      <div className="permission-info">
                        <span className="permission-name" title={permission.name}>
                          {formatPermissionName(permission)}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Group" : "Update Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<ExtendedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: ExtendedGroup } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissionSearch, setPermissionSearch] = useState('');

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: PaginatedGroupList = await groupsList();
      setGroups(response.results as ExtendedGroup[]);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      let allPermissions: Permission[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response: PaginatedPermissionList = await permissionsList(undefined, page);
        allPermissions = [...allPermissions, ...(response.results || [])];
        
        // Check if there are more pages
        hasMore = !!response.next;
        page++;
        
        // Safety break to avoid infinite loops
        if (page > 20) break;
      }
      
      setPermissions(allPermissions);
      console.log(`Loaded ${allPermissions.length} permissions for groups`);
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadPermissions();
  }, []);

  const handleCreateGroup = async (data: GroupFormData) => {
    const createData: any = {
      name: data.name,
      permission_ids: data.permission_ids,
    };
    
    await groupsCreate(createData);
    setShowForm(null);
    await loadGroups();
  };

  const handleUpdateGroup = async (data: GroupFormData) => {
    if (!showForm?.group) return;
    
    const updateData: any = {
      name: data.name,
      permission_ids: data.permission_ids,
    };
    
    await groupsPartialUpdate(showForm.group.id, updateData);
    setShowForm(null);
    await loadGroups();
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      return;
    }

    try {
      await groupsDestroy(group.id);
      await loadGroups();
    } catch (err: any) {
      setError(err.message || "Failed to delete group");
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter permissions based on search
  const filteredPermissions = permissions.filter(permission => {
    if (!permissionSearch) return true;
    const searchLower = permissionSearch.toLowerCase();
    return (
      permission.name?.toLowerCase().includes(searchLower) ||
      permission.model?.toLowerCase().includes(searchLower) ||
      permission.app_label?.toLowerCase().includes(searchLower) ||
      formatPermissionName(permission).toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="groups-container">
        <div className="loading-spinner">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="groups-container">
      <div className="groups-header">
        <div className="header-left">
          <h1>Groups Management</h1>
          <p>Manage user groups and permissions</p>
        </div>
        <button 
          className="create-btn"
          onClick={() => setShowForm({ mode: 'create' })}
        >
          + Create Group
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="groups-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="groups-grid">
        {filteredGroups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No groups found</h3>
            <p>
              {searchTerm 
                ? "No groups match your search criteria" 
                : "Create your first group to get started"
              }
            </p>
            {!searchTerm && (
              <button 
                className="create-btn"
                onClick={() => setShowForm({ mode: 'create' })}
              >
                Create Group
              </button>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="group-header">
                <h3>{group.name}</h3>
                <div className="group-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => setShowForm({ mode: 'edit', group })}
                    title="Edit group"
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteGroup(group)}
                    title="Delete group"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="group-info">
                <div className="info-item">
                  <span className="label">Members:</span>
                  <span className="value">{group.user_count}</span>
                </div>
              </div>

              <div className="group-permissions">
                <h4>Group Permissions:</h4>
                <div className="permissions-summary">
                  {(() => {
                    const groupPermissions = group.permissions || [];
                    return groupPermissions.length > 0 ? (
                      <div className="permissions-list">
                        {groupPermissions.map((permission) => (
                          <span key={permission.id} className="permission-badge" title={permission.name}>
                            {permission.codename}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-permissions">No permissions assigned</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <GroupForm
          mode={showForm.mode}
          group={showForm.group}
          onSubmit={showForm.mode === 'create' ? handleCreateGroup : handleUpdateGroup}
          onCancel={() => setShowForm(null)}
          permissions={filteredPermissions}
          permissionSearch={permissionSearch}
          setPermissionSearch={setPermissionSearch}
        />
      )}
    </div>
  );
};

export default GroupManagement;
