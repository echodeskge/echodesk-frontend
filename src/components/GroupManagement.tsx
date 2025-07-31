import React, { useState, useEffect } from 'react';
import { Group, GroupCreate, PaginatedGroupList } from '../api/generated/interfaces';
import { groupsList, groupsCreate, groupsUpdate, groupsDestroy } from '../api/generated/api';
import './GroupManagement.css';

interface GroupFormData {
  name: string;
}

interface GroupFormProps {
  mode: 'create' | 'edit';
  group?: Group;
  onSubmit: (data: GroupFormData) => Promise<void>;
  onCancel: () => void;
}

const GroupForm: React.FC<GroupFormProps> = ({ mode, group, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: group?.name || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<{ mode: 'create' | 'edit'; group?: Group } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: PaginatedGroupList = await groupsList();
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

  const handleCreateGroup = async (data: GroupFormData) => {
    const createData: GroupCreate = {
      name: data.name,
    };
    
    await groupsCreate(createData);
    setShowForm(null);
    await loadGroups();
  };

  const handleUpdateGroup = async (data: GroupFormData) => {
    if (!showForm?.group) return;
    
    await groupsUpdate(showForm.group.id, { name: data.name });
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

              {group.users && group.users.length > 0 && (
                <div className="group-users">
                  <h4>Users in this group:</h4>
                  <div className="users-list">
                    {group.users.map((username, index) => (
                      <span key={index} className="user-badge">
                        {username}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
