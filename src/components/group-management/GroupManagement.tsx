import React, { useState, useEffect } from 'react';
import './GroupManagement.css';

interface Group {
  id: number;
  name: string;
  user_count: number;
  users: string[];
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface GroupManagementProps {
  tenantSlug: string;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ tenantSlug }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data.results || data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/users/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.results || data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.name?.[0] || 'Failed to create group');
      }

      const newGroup = await response.json();
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) return;

    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/${editingGroup.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editGroupName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.name?.[0] || 'Failed to update group');
      }

      const updatedGroup = await response.json();
      setGroups(groups.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      setEditingGroup(null);
      setEditGroupName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/${groupId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddUsersToGroup = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/${selectedGroup.id}/add_users/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: selectedUsers }),
      });

      if (!response.ok) {
        throw new Error('Failed to add users to group');
      }

      const data = await response.json();
      setGroups(groups.map(g => g.id === selectedGroup.id ? data.group : g));
      setSelectedUsers([]);
      setShowUserManagement(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveUsersFromGroup = async (userIds: number[]) => {
    if (!selectedGroup || userIds.length === 0) return;

    try {
      const token = localStorage.getItem(`authToken_${tenantSlug}`);
      const response = await fetch(`/api/groups/${selectedGroup.id}/remove_users/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove users from group');
      }

      const data = await response.json();
      setGroups(groups.map(g => g.id === selectedGroup.id ? data.group : g));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading groups...</div>;
  }

  return (
    <div className="group-management">
      <div className="group-management-header">
        <h2>Group Management</h2>
        <button 
          className="create-group-btn"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Group
        </button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateGroup} className="group-form">
              <div className="form-group">
                <label htmlFor="groupName">Group Name</label>
                <input
                  type="text"
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Form */}
      {editingGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Group</h3>
              <button onClick={() => setEditingGroup(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateGroup} className="group-form">
              <div className="form-group">
                <label htmlFor="editGroupName">Group Name</label>
                <input
                  type="text"
                  id="editGroupName"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setEditingGroup(null)}>
                  Cancel
                </button>
                <button type="submit">Update Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserManagement && selectedGroup && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Manage Users in {selectedGroup.name}</h3>
              <button onClick={() => setShowUserManagement(false)}>×</button>
            </div>
            <div className="user-management-content">
              <div className="current-users">
                <h4>Current Members ({selectedGroup.user_count})</h4>
                <div className="user-list">
                  {selectedGroup.users.map((user, index) => (
                    <div key={index} className="user-item">
                      <span>{user}</span>
                      <button
                        className="remove-user-btn"
                        onClick={() => {
                          // Find user ID by email - this is a simplified approach
                          const foundUser = users.find(u => u.email === user);
                          if (foundUser) {
                            handleRemoveUsersFromGroup([foundUser.id]);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="add-users">
                <h4>Add Users</h4>
                <div className="user-selection">
                  {users.filter(user => !selectedGroup.users.includes(user.email)).map(user => (
                    <label key={user.id} className="user-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <span>{user.full_name} ({user.email})</span>
                    </label>
                  ))}
                </div>
                <button
                  className="add-selected-users-btn"
                  onClick={handleAddUsersToGroup}
                  disabled={selectedUsers.length === 0}
                >
                  Add Selected Users ({selectedUsers.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Table */}
      <div className="groups-table-container">
        <table className="groups-table">
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Members</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr key={group.id}>
                <td className="group-name">{group.name}</td>
                <td className="member-count">{group.user_count} members</td>
                <td className="actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => {
                      setEditingGroup(group);
                      setEditGroupName(group.name);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="action-btn manage-btn"
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowUserManagement(true);
                      setSelectedUsers([]);
                    }}
                  >
                    Manage Users
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {groups.length === 0 && (
          <div className="empty-state">
            <p>No groups found. Create your first group to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagement;
