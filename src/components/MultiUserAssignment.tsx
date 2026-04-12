'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, TicketAssignment } from '@/api/generated/interfaces';
import { cn } from '@/lib/utils';

export interface AssignmentData {
  userId: number;
  role: 'primary' | 'collaborator' | 'reviewer' | 'observer';
}

interface MultiUserAssignmentProps {
  users?: User[];
  assignments?: TicketAssignment[];
  selectedAssignments?: AssignmentData[];
  onChange: (assignments: AssignmentData[]) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  noUsersFoundText?: string;
  noUsersAvailableText?: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  primary: { label: 'Primary', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  collaborator: { label: 'Collaborator', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  reviewer: { label: 'Reviewer', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  observer: { label: 'Observer', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
};

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName || lastName) {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  }
  return (email || '?')[0].toUpperCase();
}

function getUserName(user: User): string {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.email?.split('@')[0] || 'Unknown';
}

export default function MultiUserAssignment({
  users = [],
  assignments = [],
  selectedAssignments = [],
  onChange,
  disabled = false,
  placeholder = 'Assign...',
  searchPlaceholder = 'Search users...',
  noUsersFoundText = 'No users found',
  noUsersAvailableText = 'No users available'
}: MultiUserAssignmentProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isUserSelected = (userId: number) =>
    selectedAssignments.some(a => a.userId === userId);

  const getUserRole = (userId: number) =>
    selectedAssignments.find(a => a.userId === userId)?.role || 'collaborator';

  const handleToggleUser = (userId: number) => {
    if (disabled) return;
    if (isUserSelected(userId)) {
      onChange(selectedAssignments.filter(a => a.userId !== userId));
    } else {
      onChange([...selectedAssignments, { userId, role: 'collaborator' }]);
    }
  };

  const handleRoleChange = (userId: number, role: AssignmentData['role']) => {
    if (disabled) return;
    onChange(selectedAssignments.map(a =>
      a.userId === userId ? { ...a, role } : a
    ));
  };

  const handleRemove = (userId: number) => {
    if (disabled) return;
    onChange(selectedAssignments.filter(a => a.userId !== userId));
  };

  const unselectedUsers = users.filter(u => !isUserSelected(u.id));

  return (
    <div className="space-y-2">
      {/* Assigned users as chips */}
      {selectedAssignments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAssignments.map(assignment => {
            const user = users.find(u => u.id === assignment.userId);
            if (!user) return null;
            const role = ROLE_CONFIG[assignment.role] || ROLE_CONFIG.collaborator;

            return (
              <div
                key={assignment.userId}
                className="inline-flex items-center gap-1 rounded-lg border bg-card px-2 py-1 group/user"
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                    {getInitials(user.first_name, user.last_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate max-w-[100px]">
                  {getUserName(user)}
                </span>

                {/* Role selector */}
                <Select
                  value={assignment.role}
                  onValueChange={(val) => handleRoleChange(assignment.userId, val as AssignmentData['role'])}
                  disabled={disabled}
                >
                  <SelectTrigger
                    className={cn(
                      "h-5 w-auto border-none shadow-none text-[10px] font-medium px-1.5 py-0 rounded-md focus:ring-0",
                      role.bg, role.color
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Remove button */}
                {!disabled && (
                  <button
                    onClick={() => handleRemove(assignment.userId)}
                    className="opacity-0 group-hover/user:opacity-100 transition-opacity h-4 w-4 rounded-full hover:bg-destructive/10 flex items-center justify-center shrink-0"
                  >
                    <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add user button */}
      {!disabled && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-md border border-dashed border-muted-foreground/30 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/50 transition-colors">
              <Plus className="h-3 w-3" />
              {selectedAssignments.length === 0 ? placeholder : 'Add'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder={searchPlaceholder} className="h-8" />
              <CommandList>
                <CommandEmpty>{noUsersFoundText}</CommandEmpty>
                <CommandGroup>
                  {users.map(user => {
                    const selected = isUserSelected(user.id);
                    return (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleToggleUser(user.id)}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-3 w-3", selected ? "opacity-100" : "opacity-0")} />
                        <Avatar className="h-5 w-5 mr-2 shrink-0">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(user.first_name, user.last_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{getUserName(user)}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
