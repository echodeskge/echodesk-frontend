'use client';

import { useState, useEffect, useRef } from 'react';
import type { User, TicketAssignment } from '@/api/generated/interfaces';

export interface AssignmentData {
  userId: number;
  role: 'primary' | 'collaborator' | 'reviewer' | 'observer';
}

interface MultiUserAssignmentProps {
  users: User[];
  assignments?: TicketAssignment[];
  selectedAssignments: AssignmentData[];
  onChange: (assignments: AssignmentData[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const roleOptions = [
  { value: 'primary', label: 'Primary Assignee', color: '#e74c3c' },
  { value: 'collaborator', label: 'Collaborator', color: '#3498db' },
  { value: 'reviewer', label: 'Reviewer', color: '#f39c12' },
  { value: 'observer', label: 'Observer', color: '#95a5a6' }
];

export default function MultiUserAssignment({
  users,
  assignments = [],
  selectedAssignments,
  onChange,
  disabled = false,
  placeholder = 'Select users to assign...'
}: MultiUserAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(user => 
    !searchTerm || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserSelected = (userId: number) => 
    selectedAssignments.some(assignment => assignment.userId === userId);

  const getUserRole = (userId: number) => 
    selectedAssignments.find(assignment => assignment.userId === userId)?.role || 'collaborator';

  const handleUserToggle = (userId: number) => {
    if (disabled) return;

    const isSelected = isUserSelected(userId);
    
    if (isSelected) {
      // Remove user
      onChange(selectedAssignments.filter(assignment => assignment.userId !== userId));
    } else {
      // Add user with default role
      onChange([...selectedAssignments, { userId, role: 'collaborator' }]);
    }
  };

  const handleRoleChange = (userId: number, role: 'primary' | 'collaborator' | 'reviewer' | 'observer') => {
    if (disabled) return;

    onChange(selectedAssignments.map(assignment => 
      assignment.userId === userId 
        ? { ...assignment, role }
        : assignment
    ));
  };

  const removeAssignment = (userId: number) => {
    if (disabled) return;
    onChange(selectedAssignments.filter(assignment => assignment.userId !== userId));
  };

  const getSelectedUsersDisplay = () => {
    if (selectedAssignments.length === 0) {
      return <span style={{ color: '#6c757d' }}>{placeholder}</span>;
    }

    if (selectedAssignments.length === 1) {
      const userId = selectedAssignments[0].userId;
      const user = users.find(u => u.id === userId);
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
    }

    return `${selectedAssignments.length} users selected`;
  };

  const getUserDisplay = (user: User) => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
    return `${name} (${user.email})`;
  };

  const getRoleColor = (role: string) => {
    return roleOptions.find(opt => opt.value === role)?.color || '#95a5a6';
  };

  const getRoleLabel = (role: string) => {
    return roleOptions.find(opt => opt.value === role)?.label || role;
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Selected Assignments Display */}
      {selectedAssignments.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {selectedAssignments.map(assignment => {
              const user = users.find(u => u.id === assignment.userId);
              if (!user) return null;

              return (
                <div
                  key={assignment.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'white',
                    border: '2px solid #e1e5e9',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>
                    {getUserDisplay(user)}
                  </span>
                  
                  <select
                    value={assignment.role}
                    onChange={(e) => handleRoleChange(assignment.userId, e.target.value as any)}
                    disabled={disabled}
                    style={{
                      background: getRoleColor(assignment.role),
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeAssignment(assignment.userId)}
                    disabled={disabled}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      padding: '0',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove assignment"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px',
          border: '2px solid #e1e5e9',
          borderRadius: '6px',
          backgroundColor: disabled ? '#f8f9fa' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{getSelectedUsersDisplay()}</span>
        <span style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '2px solid #e1e5e9',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflow: 'hidden'
        }}>
          {/* Search Input */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e1e5e9' }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* User List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '14px'
              }}>
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map(user => {
                const selected = isUserSelected(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserToggle(user.id)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f1f1',
                      background: selected ? '#f8f9ff' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {}} // Handled by parent div click
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        {getUserDisplay(user)}
                      </span>
                    </div>
                    
                    {selected && (
                      <span
                        style={{
                          background: getRoleColor(getUserRole(user.id)),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {getRoleLabel(getUserRole(user.id))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}