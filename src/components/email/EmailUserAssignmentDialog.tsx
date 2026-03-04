"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Loader2, Users, X, Check, Search, UsersRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useInfiniteUsers } from "@/hooks/api/useUsers";
import {
  useUpdateEmailConnectionAssignments,
  EmailConnectionDetail,
} from "@/hooks/api/useSocial";
import type { User } from "@/api/generated/interfaces";

interface GroupInfo {
  id: number;
  name: string;
}

interface EmailUserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: EmailConnectionDetail | null;
}

export function EmailUserAssignmentDialog({
  open,
  onOpenChange,
  connection,
}: EmailUserAssignmentDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "groups">("users");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users with infinite scroll
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers({ enabled: open, search: debouncedSearch });

  const updateAssignments = useUpdateEmailConnectionAssignments();

  // Flatten all pages of users
  const allUsers = useMemo(() => {
    if (!usersData?.pages) return [];
    return usersData.pages.flatMap((page) => page.results || []);
  }, [usersData?.pages]);

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Extract unique groups from users (using tenant_groups)
  const groups = useMemo(() => {
    const groupMap = new Map<number, GroupInfo>();
    allUsers.forEach((user) => {
      if (user.tenant_groups && Array.isArray(user.tenant_groups)) {
        user.tenant_groups.forEach((group) => {
          if (group?.id && group?.name) {
            groupMap.set(group.id, {
              id: group.id,
              name: group.name,
            });
          }
        });
      }
    });

    return Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  // Get users by group
  const getUsersByGroup = useCallback((groupId: number) => {
    return allUsers.filter((user) =>
      user.tenant_groups?.some((g) => g.id === groupId)
    );
  }, [allUsers]);

  // Check if all users in a group are selected
  const isGroupFullySelected = useCallback((groupId: number) => {
    const groupUsers = getUsersByGroup(groupId);
    return groupUsers.length > 0 && groupUsers.every((user) => selectedUserIds.includes(user.id));
  }, [getUsersByGroup, selectedUserIds]);

  // Check if some users in a group are selected
  const isGroupPartiallySelected = useCallback((groupId: number) => {
    const groupUsers = getUsersByGroup(groupId);
    const selectedCount = groupUsers.filter((user) => selectedUserIds.includes(user.id)).length;
    return selectedCount > 0 && selectedCount < groupUsers.length;
  }, [getUsersByGroup, selectedUserIds]);

  // Toggle group selection (selects/deselects all users in the group)
  const toggleGroup = useCallback((groupId: number) => {
    const groupUsers = getUsersByGroup(groupId);
    const groupUserIds = groupUsers.map((u) => u.id);

    if (isGroupFullySelected(groupId)) {
      setSelectedUserIds((prev) => prev.filter((id) => !groupUserIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => {
        const newIds = groupUserIds.filter((id) => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  }, [getUsersByGroup, isGroupFullySelected]);

  // Initialize selected users when connection changes
  useEffect(() => {
    if (connection?.assigned_users) {
      setSelectedUserIds(connection.assigned_users.map((u) => u.user_id));
    } else {
      setSelectedUserIds([]);
    }
  }, [connection]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedSearch("");
      setActiveTab("users");
    }
  }, [open]);

  // Filter groups based on search query (local filter since groups come from users)
  const filteredGroups = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groups, debouncedSearch]);

  // Toggle user selection
  const toggleUser = useCallback((userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!connection) return;

    try {
      await updateAssignments.mutateAsync({
        connectionId: connection.id,
        userIds: selectedUserIds,
      });

      toast({
        title: "Access updated",
        description: selectedUserIds.length === 0
          ? "All users can now access this email account"
          : `${selectedUserIds.length} user(s) assigned to this email account`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to update access",
        description: error.response?.data?.error || "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Get user initials for avatar
  const getUserInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  // Get user display name
  const getUserDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    return fullName || email || "Unknown User";
  };

  // Find user by ID (for selected badges)
  const findUserById = useCallback((userId: number): User | undefined => {
    return allUsers.find((u) => u.id === userId);
  }, [allUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Access
          </DialogTitle>
          <DialogDescription>
            {connection?.email_address
              ? `Choose which users can access ${connection.email_address}`
              : "Choose which users can access this email account"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info text */}
          <p className="text-sm text-muted-foreground">
            {selectedUserIds.length === 0
              ? "No users selected - all team members can access this account"
              : `${selectedUserIds.length} user(s) selected - only selected users can access this account`}
          </p>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs for Users and Groups */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "groups")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <UsersRound className="h-4 w-4" />
                Groups
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4">
              <div
                ref={scrollRef}
                className="h-[250px] border rounded-md overflow-y-auto"
                onScroll={handleScroll}
              >
                {isLoadingUsers && allUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {debouncedSearch ? "No users found" : "No users available"}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {allUsers.map((user) => {
                      const isSelected = selectedUserIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            isSelected ? "bg-muted" : ""
                          }`}
                          onClick={() => toggleUser(user.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleUser(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user.first_name, user.last_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getUserDisplayName(user.first_name, user.last_name, user.email)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                              {user.tenant_groups && user.tenant_groups.length > 0 && (
                                <span className="ml-2 text-muted-foreground/70">
                                  ({user.tenant_groups.map((g) => g.name).join(", ")})
                                </span>
                              )}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {/* Loading more indicator */}
                    {isFetchingNextPage && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
                      </div>
                    )}
                    {/* Load more trigger */}
                    {hasNextPage && !isFetchingNextPage && (
                      <div className="flex items-center justify-center py-2">
                        <span className="text-xs text-muted-foreground">Scroll for more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="mt-4">
              <ScrollArea className="h-[250px] border rounded-md">
                {isLoadingUsers && allUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {debouncedSearch ? "No groups found" : "No groups available"}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredGroups.map((group) => {
                      const groupUsers = getUsersByGroup(group.id);
                      const selectedCount = groupUsers.filter((u) =>
                        selectedUserIds.includes(u.id)
                      ).length;
                      const isFullySelected = isGroupFullySelected(group.id);
                      const isPartiallySelected = isGroupPartiallySelected(group.id);

                      return (
                        <div
                          key={group.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            isFullySelected ? "bg-muted" : ""
                          }`}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <Checkbox
                            checked={isFullySelected}
                            className={isPartiallySelected ? "data-[state=unchecked]:bg-primary/30" : ""}
                            onCheckedChange={() => toggleGroup(group.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <UsersRound className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedCount > 0
                                ? `${selectedCount} of ${groupUsers.length} user(s) selected`
                                : `${groupUsers.length} user(s)`}
                            </p>
                          </div>
                          {isFullySelected && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Selected users badges */}
          {selectedUserIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selected Users:</p>
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                {selectedUserIds.map((userId) => {
                  const user = findUserById(userId);
                  if (!user) {
                    // User might not be loaded yet, show ID
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        User #{userId}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => toggleUser(userId)}
                        />
                      </Badge>
                    );
                  }
                  return (
                    <Badge
                      key={userId}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {getUserDisplayName(user.first_name, user.last_name, user.email)}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => toggleUser(userId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateAssignments.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAssignments.isPending}
          >
            {updateAssignments.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
