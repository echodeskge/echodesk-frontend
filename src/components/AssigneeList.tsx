'use client';

import type { UserMinimal, TicketAssignment } from '@/api/generated/interfaces';

interface AssigneeListProps {
  assigned_to?: UserMinimal | null;
  assigned_users?: UserMinimal[];
  assignments?: TicketAssignment[];
  maxDisplay?: number;
  showRoles?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const roleColors = {
  primary: '#e74c3c',
  collaborator: '#3498db',
  reviewer: '#f39c12',
  observer: '#95a5a6'
};

const roleLabels = {
  primary: 'Primary',
  collaborator: 'Collaborator',
  reviewer: 'Reviewer',
  observer: 'Observer'
};

export default function AssigneeList({
  assigned_to,
  assigned_users = [],
  assignments = [],
  maxDisplay = 3,
  showRoles = false,
  size = 'medium'
}: AssigneeListProps) {

  // Get the final list of users to display
  let usersToShow: UserMinimal[] = [];
  
  if (assignments.length > 0) {
    // Use assignments if available (new multi-user system)
    usersToShow = assignments.map(assignment => assignment.user);
  } else if (assigned_users.length > 0) {
    // Use assigned_users if available
    usersToShow = assigned_users;
  } else if (assigned_to) {
    // Fall back to single assigned_to
    usersToShow = [assigned_to];
  }

  if (usersToShow.length === 0) {
    return (
      <span style={{
        color: '#6c757d',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        fontStyle: 'italic'
      }}>
        Unassigned
      </span>
    );
  }

  const getUserDisplay = (user: UserMinimal) => {
    const name = `${user.first_name} ${user.last_name}`.trim();
    return name || user.email;
  };

  const getUserRole = (user: UserMinimal) => {
    const assignment = assignments.find(a => a.user.id === user.id);
    return (assignment?.role || 'collaborator') as keyof typeof roleColors;
  };

  const getRoleColor = (role: keyof typeof roleColors) => {
    return roleColors[role] || roleColors.collaborator;
  };

  const displayUsers = usersToShow.slice(0, maxDisplay);
  const remainingCount = usersToShow.length - maxDisplay;

  const getUserInitials = (user: UserMinimal) => {
    const name = `${user.first_name} ${user.last_name}`.trim();
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  if (size === 'small' || !showRoles) {
    // Compact display for list views
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px'
      }}>
        {/* User avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '-2px' }}>
          {displayUsers.map((user, index) => {
            const role = getUserRole(user);
            return (
              <div
                key={user.id}
                style={{
                  width: size === 'small' ? '24px' : size === 'large' ? '32px' : '28px',
                  height: size === 'small' ? '24px' : size === 'large' ? '32px' : '28px',
                  borderRadius: '50%',
                  background: getRoleColor(role),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: size === 'small' ? '10px' : size === 'large' ? '12px' : '11px',
                  fontWeight: '500',
                  border: '2px solid white',
                  marginLeft: index > 0 ? '-6px' : '0',
                  zIndex: displayUsers.length - index
                }}
                title={`${getUserDisplay(user)} (${roleLabels[role]})`}
              >
                {getUserInitials(user)}
              </div>
            );
          })}
          
          {remainingCount > 0 && (
            <div
              style={{
                width: size === 'small' ? '24px' : size === 'large' ? '32px' : '28px',
                height: size === 'small' ? '24px' : size === 'large' ? '32px' : '28px',
                borderRadius: '50%',
                background: '#95a5a6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size === 'small' ? '9px' : size === 'large' ? '11px' : '10px',
                fontWeight: '500',
                border: '2px solid white',
                marginLeft: '-6px',
                zIndex: 0
              }}
              title={`+${remainingCount} more`}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Names for single user or count for multiple */}
        {usersToShow.length === 1 ? (
          <span style={{ color: '#2c3e50' }}>
            {getUserDisplay(usersToShow[0])}
          </span>
        ) : (
          <span style={{ color: '#6c757d' }}>
            {usersToShow.length} assigned
          </span>
        )}
      </div>
    );
  }

  // Full display with roles for detail views
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center'
    }}>
      {usersToShow.map(user => {
        const role = getUserRole(user);
        return (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'white',
              border: `2px solid ${getRoleColor(role)}`,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '14px',
              gap: '6px'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getRoleColor(role),
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '500'
              }}
            >
              {getUserInitials(user)}
            </div>
            
            <span style={{ fontWeight: '500' }}>
              {getUserDisplay(user)}
            </span>
            
            {showRoles && (
              <span
                style={{
                  background: getRoleColor(role),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}
              >
                {roleLabels[role]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}