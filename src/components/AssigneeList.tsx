'use client';

import type { UserMinimal, TicketAssignment } from '@/api/generated/interfaces';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface AssigneeListProps {
  assigned_to?: UserMinimal | null;
  assigned_users?: UserMinimal[];
  assignments?: TicketAssignment[];
  maxDisplay?: number;
  showRoles?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const roleColorClasses = {
  primary: 'bg-red-600',
  collaborator: 'bg-blue-600',
  reviewer: 'bg-orange-500',
  observer: 'bg-gray-500'
};

const roleBorderClasses = {
  primary: 'border-red-600',
  collaborator: 'border-blue-600',
  reviewer: 'border-orange-500',
  observer: 'border-gray-500'
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
      <span className={cn(
        'text-muted-foreground italic',
        size === 'small' && 'text-xs',
        size === 'medium' && 'text-sm',
        size === 'large' && 'text-base'
      )}>
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
    return (assignment?.role || 'collaborator') as keyof typeof roleColorClasses;
  };

  const getRoleColorClass = (role: keyof typeof roleColorClasses) => {
    return roleColorClasses[role] || roleColorClasses.collaborator;
  };

  const getRoleBorderClass = (role: keyof typeof roleBorderClasses) => {
    return roleBorderClasses[role] || roleBorderClasses.collaborator;
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
      <div className={cn(
        'flex items-center gap-1.5',
        size === 'small' && 'text-xs',
        size === 'medium' && 'text-sm',
        size === 'large' && 'text-base'
      )}>
        {/* User avatars */}
        <div className="flex items-center">
          {displayUsers.map((user, index) => {
            const role = getUserRole(user);
            return (
              <div
                key={user.id}
                className={cn(
                  'rounded-full text-white flex items-center justify-center font-medium border-2 border-white',
                  getRoleColorClass(role),
                  size === 'small' && 'w-6 h-6 text-[10px]',
                  size === 'medium' && 'w-7 h-7 text-[11px]',
                  size === 'large' && 'w-8 h-8 text-xs',
                  index > 0 && '-ml-1.5'
                )}
                style={{ zIndex: displayUsers.length - index }}
                title={`${getUserDisplay(user)} (${roleLabels[role]})`}
              >
                {getUserInitials(user)}
              </div>
            );
          })}

          {remainingCount > 0 && (
            <div
              className={cn(
                'rounded-full bg-gray-500 text-white flex items-center justify-center font-medium border-2 border-white -ml-1.5',
                size === 'small' && 'w-6 h-6 text-[9px]',
                size === 'medium' && 'w-7 h-7 text-[10px]',
                size === 'large' && 'w-8 h-8 text-[11px]'
              )}
              style={{ zIndex: 0 }}
              title={`+${remainingCount} more`}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Names for single user or count for multiple */}
        {usersToShow.length === 1 ? (
          <span className="text-gray-800">
            {getUserDisplay(usersToShow[0])}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {usersToShow.length} assigned
          </span>
        )}
      </div>
    );
  }

  // Full display with roles for detail views
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {usersToShow.map(user => {
        const role = getUserRole(user);
        return (
          <div
            key={user.id}
            className={cn(
              'flex items-center bg-white border-2 rounded-full px-3 py-1 text-sm gap-1.5',
              getRoleBorderClass(role)
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-medium',
                getRoleColorClass(role)
              )}
            >
              {getUserInitials(user)}
            </div>

            <span className="font-medium">
              {getUserDisplay(user)}
            </span>

            {showRoles && (
              <Badge
                className={cn(
                  'text-white text-[11px] font-medium',
                  getRoleColorClass(role)
                )}
              >
                {roleLabels[role]}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}