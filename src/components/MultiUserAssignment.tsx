'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { User, TicketAssignment } from '@/api/generated/interfaces';

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
}

const roleOptions = [
  { value: 'primary', label: 'Primary Assignee', color: 'bg-red-500' },
  { value: 'collaborator', label: 'Collaborator', color: 'bg-blue-500' },
  { value: 'reviewer', label: 'Reviewer', color: 'bg-orange-500' },
  { value: 'observer', label: 'Observer', color: 'bg-gray-500' }
];

export default function MultiUserAssignment({
  users = [],
  assignments = [],
  selectedAssignments = [],
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

  const filteredUsers = (users || []).filter(user => 
    !searchTerm || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserSelected = (userId: number) => 
    (selectedAssignments || []).some(assignment => assignment.userId === userId);

  const getUserRole = (userId: number) => 
    (selectedAssignments || []).find(assignment => assignment.userId === userId)?.role || 'collaborator';

  const handleUserToggle = (userId: number) => {
    if (disabled) return;

    const isSelected = isUserSelected(userId);
    
    if (isSelected) {
      // Remove user
      onChange((selectedAssignments || []).filter(assignment => assignment.userId !== userId));
    } else {
      // Add user with default role
      onChange([...(selectedAssignments || []), { userId, role: 'collaborator' }]);
    }
  };

  const handleRoleChange = (userId: number, role: 'primary' | 'collaborator' | 'reviewer' | 'observer') => {
    if (disabled) return;

    onChange((selectedAssignments || []).map(assignment => 
      assignment.userId === userId 
        ? { ...assignment, role }
        : assignment
    ));
  };

  const removeAssignment = (userId: number) => {
    if (disabled) return;
    onChange((selectedAssignments || []).filter(assignment => assignment.userId !== userId));
  };

  const getSelectedUsersDisplay = () => {
    const assignments = selectedAssignments || [];
    if (assignments.length === 0) {
      return placeholder;
    }

    if (assignments.length === 1) {
      const userId = assignments[0].userId;
      const user = (users || []).find(u => u.id === userId);
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
    }

    return `${assignments.length} users selected`;
  };

  const isPlaceholderShown = () => {
    return (selectedAssignments || []).length === 0;
  };

  const getUserDisplay = (user: User) => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
    return `${name} (${user.email})`;
  };

  const getRoleColor = (role: string) => {
    return roleOptions.find(opt => opt.value === role)?.color || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    return roleOptions.find(opt => opt.value === role)?.label || role;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Assignments Display */}
      {(selectedAssignments || []).length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {(selectedAssignments || []).map(assignment => {
              const user = (users || []).find(u => u.id === assignment.userId);
              if (!user) return null;

              return (
                <div
                  key={assignment.userId}
                  className="flex items-center bg-white border-2 border-gray-200 rounded-full px-3 py-1.5 text-sm gap-2"
                >
                  <span className="font-medium">
                    {getUserDisplay(user)}
                  </span>

                  <Select
                    value={assignment.role}
                    onValueChange={(value) => handleRoleChange(assignment.userId, value as any)}
                    disabled={disabled}
                  >
                    <SelectTrigger className={`h-6 w-auto border-none text-white text-xs font-medium px-2 ${getRoleColor(assignment.role)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                      {roleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100 cursor-pointer">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    onClick={() => removeAssignment(assignment.userId)}
                    disabled={disabled}
                    variant="ghost"
                    size="icon-sm"
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                    title="Remove assignment"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown Trigger */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between bg-white border-2 border-gray-200 hover:border-gray-300"
          >
            <span className={isPlaceholderShown() ? "text-muted-foreground" : ""}>
              {getSelectedUsersDisplay()}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown Menu */}
        <DropdownMenuContent
          className="bg-white border-2 border-gray-200 shadow-lg p-0"
          align="start"
          style={{ backgroundColor: 'white', width: 'var(--radix-dropdown-menu-trigger-width)', minWidth: '400px' }}
        >
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-gray-200"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map(user => {
                const selected = isUserSelected(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserToggle(user.id)}
                    className={`p-3 cursor-pointer border-b border-gray-100 flex items-center justify-between transition-colors hover:bg-gray-100 ${
                      selected ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => {}} // Handled by parent div click
                      />
                      <span className="text-sm">
                        {getUserDisplay(user)}
                      </span>
                    </div>

                    {selected && (
                      <Badge className={`text-white text-xs font-medium ${getRoleColor(getUserRole(user.id))}`}>
                        {getRoleLabel(getUserRole(user.id))}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}