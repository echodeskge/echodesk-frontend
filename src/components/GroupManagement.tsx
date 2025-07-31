import React, { useState, useEffect } from 'react';
import { Group, GroupCreate, PaginatedGroupList, PatchedGroup, Permission, PaginatedPermissionList } from '../api/generated/interfaces';
import { groupsList, groupsCreate, groupsPartialUpdate, groupsDestroy, permissionsList } from '../api/generated/api';
import GroupPermissionForm from './GroupPermissionForm';
import { categoriesToDjangoPermissions, djangoPermissionsToCategories } from '@/utils/permissionUtils';
import './GroupManagement.css';

interface GroupFormData {
  name: string;
  permission_codenames: string[]; // Changed from permission_ids to codenames
}

interface ExtendedGroup extends Group {
  [key: string]: any; // Allow for permission fields
}

interface GroupFormProps {
  mode: 'create' | 'edit';
  group?: ExtendedGroup;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onCancel: () => void;
}

const GroupForm: React.FC<GroupFormProps> = ({ mode, group, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: group?.name || '',
    permission_codenames: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Convert group permissions to codenames on component mount
  useEffect(() => {
    if (group) {
      const groupPermissionCodenames = group.permissions?.map(p => p.codename) || [];
      
      // Debug: Show what permissions we're working with
      console.log('Editing group:', group.name);
      console.log('Group permissions from API:', group.permissions?.map(p => ({
        id: p.id,
        codename: p.codename,
        name: p.name,
        app_label: p.app_label,
        model: p.model
      })));
      console.log('Extracted codenames:', groupPermissionCodenames);
      
      setFormData({
        name: group.name || '',
        permission_codenames: groupPermissionCodenames,
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

  const handlePermissionsChange = (permissions: string[]) => {
    setFormData(prev => ({
      ...prev,
      permission_codenames: permissions
    }));
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
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? "error" : ""}
              placeholder="Enter group name"
              required
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Use the new simplified permission form */}
          <GroupPermissionForm
            selectedPermissions={formData.permission_codenames}
            onPermissionsChange={handlePermissionsChange}
            disabled={isSubmitting}
          />

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
      
      // Debug: Show sample permissions
      if (allPermissions.length > 0) {
        console.log('Sample permissions:', allPermissions.slice(0, 5).map(p => ({
          id: p.id,
          codename: p.codename,
          name: p.name,
          app_label: p.app_label,
          model: p.model
        })));
      }
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

  // Helper function to convert permission codenames to IDs
    const getPermissionIdsFromCodenames = (selectedCodenames: string[]): number[] => {
    console.log('Converting codenames to IDs:', selectedCodenames);
    
    if (!permissions || permissions.length === 0) {
      console.warn('No permissions loaded yet');
      return [];
    }

    const permissionIds: number[] = [];
    
    selectedCodenames.forEach(codename => {
      // Try different matching strategies
      const permission = permissions.find(p => {
        // Strategy 1: Direct codename match
        if (p.codename === codename) return true;
        
        // Strategy 2: Full format app.action_model
        if (p.app_label && p.model && p.codename) {
          const fullCodename = `${p.app_label}.${p.codename}`;
          if (fullCodename === codename) return true;
        }
        
        // Strategy 3: Strip app prefix if codename includes it
        if (codename.includes('.')) {
          const [, actionModel] = codename.split('.');
          if (p.codename === actionModel) return true;
        }
        
        return false;
      });
      
      if (permission) {
        permissionIds.push(permission.id);
        console.log(`Mapped codename "${codename}" to permission ID ${permission.id} (${permission.name})`);
      } else {
        console.warn(`Could not find permission for codename: ${codename}`);
        // Debug: show what permissions are available
        console.log('Available permissions (first 10):', permissions.slice(0, 10).map(p => ({
          id: p.id,
          codename: p.codename,
          full: p.app_label ? `${p.app_label}.${p.codename}` : p.codename
        })));
      }
    });

    console.log('Final permission IDs:', permissionIds);
    return permissionIds;
  };

  const handleCreateGroup = async (data: GroupFormData) => {
    try {
      const permissionIds = getPermissionIdsFromCodenames(data.permission_codenames);
      
      if (data.permission_codenames.length > 0 && permissionIds.length === 0) {
        throw new Error("Failed to convert permission codenames to IDs. Please try again.");
      }
      
      const createData: any = {
        name: data.name,
        permission_ids: permissionIds, // Convert codenames to IDs
      };
      
      await groupsCreate(createData);
      setShowForm(null);
      await loadGroups();
    } catch (err: any) {
      setError(err.message || "Failed to create group");
      throw err; // Re-throw to let the form handle it
    }
  };

  const handleUpdateGroup = async (data: GroupFormData) => {
    if (!showForm?.group) return;
    
    try {
      const permissionIds = getPermissionIdsFromCodenames(data.permission_codenames);
      
      if (data.permission_codenames.length > 0 && permissionIds.length === 0) {
        throw new Error("Failed to convert permission codenames to IDs. Please try again.");
      }
      
      const updateData: any = {
        name: data.name,
        permission_ids: permissionIds, // Convert codenames to IDs
      };
      
      await groupsPartialUpdate(showForm.group.id, updateData);
      setShowForm(null);
      await loadGroups();
    } catch (err: any) {
      setError(err.message || "Failed to update group");
      throw err; // Re-throw to let the form handle it
    }
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

  if (loading || loadingPermissions) {
    return (
      <div className="groups-container">
        <div className="loading-spinner">
          Loading {loading ? 'groups' : 'permissions'}...
        </div>
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
                    const groupPermissionCodenames = groupPermissions.map(p => p.codename);
                    const selectedCategories = djangoPermissionsToCategories(groupPermissionCodenames);
                    
                    return selectedCategories.length > 0 ? (
                      <div className="permissions-list">
                        {selectedCategories.map((category) => {
                          const categoryLabels: { [key: string]: string } = {
                            'tickets': 'Tickets 🎫',
                            'calls': 'Calls 📞',
                            'user_management': 'User Management 👥'
                          };
                          return (
                            <span key={category} className="permission-badge">
                              {categoryLabels[category] || category}
                            </span>
                          );
                        })}
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6c757d', 
                          marginTop: '4px' 
                        }}>
                          ({groupPermissions.length} Django permissions)
                        </div>
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
        />
      )}
    </div>
  );
};

export default GroupManagement;
