'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TenantGroup } from '@/api/generated/interfaces';

interface MultiGroupSelectionProps {
  groups?: TenantGroup[];
  selectedGroupIds?: number[];
  onChange: (groupIds: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MultiGroupSelection({
  groups = [],
  selectedGroupIds = [],
  onChange,
  disabled = false,
  placeholder = 'Select groups to assign...'
}: MultiGroupSelectionProps) {
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

  const filteredGroups = (groups || []).filter(group =>
    !searchTerm ||
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isGroupSelected = (groupId: number) =>
    (selectedGroupIds || []).includes(groupId);

  const handleGroupToggle = (groupId: number) => {
    if (disabled) return;

    const isSelected = isGroupSelected(groupId);

    if (isSelected) {
      // Remove group
      onChange((selectedGroupIds || []).filter(id => id !== groupId));
    } else {
      // Add group
      onChange([...(selectedGroupIds || []), groupId]);
    }
  };

  const removeGroup = (groupId: number) => {
    if (disabled) return;
    onChange((selectedGroupIds || []).filter(id => id !== groupId));
  };

  const getSelectedGroupsDisplay = () => {
    const groupIds = selectedGroupIds || [];
    if (groupIds.length === 0) {
      return placeholder;
    }

    if (groupIds.length === 1) {
      const group = (groups || []).find(g => g.id === groupIds[0]);
      return group ? group.name : 'Unknown Group';
    }

    return `${groupIds.length} groups selected`;
  };

  const isPlaceholderShown = () => {
    return (selectedGroupIds || []).length === 0;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Groups Display */}
      {(selectedGroupIds || []).length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {(selectedGroupIds || []).map(groupId => {
              const group = (groups || []).find(g => g.id === groupId);
              if (!group) return null;

              return (
                <div
                  key={groupId}
                  className="flex items-center bg-white border-2 border-gray-200 rounded-full px-3 py-1.5 text-sm gap-2"
                >
                  <span className="font-medium">
                    {group.name}
                  </span>

                  <Button
                    type="button"
                    onClick={() => removeGroup(groupId)}
                    disabled={disabled}
                    variant="ghost"
                    size="icon-sm"
                    className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                    title="Remove group"
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
              {getSelectedGroupsDisplay()}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown Menu */}
        <DropdownMenuContent className="w-full bg-white border-2 border-gray-200 shadow-lg p-0" align="start" style={{ backgroundColor: 'white' }}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-gray-200"
              />
            </div>
          </div>

          {/* Group List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchTerm ? 'No groups found' : 'No groups available'}
              </div>
            ) : (
              filteredGroups.map(group => {
                const selected = isGroupSelected(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleGroupToggle(group.id)}
                    className={`p-3 cursor-pointer border-b border-gray-100 flex items-center justify-between transition-colors hover:bg-gray-100 ${
                      selected ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => {}} // Handled by parent div click
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {group.name}
                        </span>
                        {group.description && (
                          <span className="text-xs text-muted-foreground">
                            {group.description}
                          </span>
                        )}
                      </div>
                    </div>
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
