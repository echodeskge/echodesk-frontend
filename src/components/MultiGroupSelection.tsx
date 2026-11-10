'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TenantGroup } from '@/api/generated/interfaces';

/** Texts of the picker (English defaults; callers inside an intl provider pass translations). */
export interface MultiGroupSelectionLabels {
  remove: string;
  unknown: string;
  /** "{count} groups selected" with the count already filled in. */
  selected: (count: number) => string;
  search: string;
  noMatch: string;
  none: string;
}

const DEFAULT_LABELS: MultiGroupSelectionLabels = {
  remove: 'Remove group',
  unknown: 'Unknown Group',
  selected: (count) => `${count} groups selected`,
  search: 'Search groups...',
  noMatch: 'No groups found',
  none: 'No groups available',
};

interface MultiGroupSelectionProps {
  groups?: TenantGroup[];
  selectedGroupIds?: number[];
  onChange: (groupIds: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
  labels?: Partial<MultiGroupSelectionLabels>;
}

export default function MultiGroupSelection({
  groups = [],
  selectedGroupIds = [],
  onChange,
  disabled = false,
  placeholder = 'Select groups to assign...',
  labels: labelsProp,
}: MultiGroupSelectionProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
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
      return group ? group.name : labels.unknown;
    }

    return labels.selected(groupIds.length);
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
                  className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
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
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                    title={labels.remove}
                    aria-label={labels.remove}
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
            className="h-[34px] w-full justify-between bg-background px-2.5 text-[13px] font-normal"
          >
            <span className={isPlaceholderShown() ? "text-muted-foreground" : ""}>
              {getSelectedGroupsDisplay()}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown Menu */}
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] p-0" align="start">
          {/* Search Input */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={labels.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>

          {/* Group List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchTerm ? labels.noMatch : labels.none}
              </div>
            ) : (
              filteredGroups.map(group => {
                const selected = isGroupSelected(group.id);
                return (
                  <div
                    key={group.id}
                    onClick={() => handleGroupToggle(group.id)}
                    className={`flex cursor-pointer items-center justify-between border-b px-3 py-2 transition-colors last:border-b-0 hover:bg-muted/60 ${
                      selected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => {}} // Handled by parent div click
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">
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
