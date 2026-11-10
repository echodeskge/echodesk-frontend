"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { usersList, usersCreate, usersUpdate, usersPartialUpdate, usersDestroy } from '@/api/generated/api';
import type { PaginatedUserList, UserCreateRequest, UserUpdateRequest, PatchedUserUpdateRequest, UserCreate, UserUpdate } from '@/api/generated/interfaces';
import { authService } from '@/services/auth';
import axios from '@/api/axios';

/** Server-side filters of the user list (UserViewSet filterset: role, status, is_active, is_staff). */
export interface UserListFilters {
  role?: 'admin' | 'agent' | 'manager' | 'viewer';
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  isActive?: boolean | null;
  isStaff?: boolean | null;
}

/** Query params for the filters that are set (null / undefined / "" are left out). */
export function userFilterParams(filters?: UserListFilters): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (!filters) return out;
  if (filters.role) out.role = filters.role;
  if (filters.status) out.status = filters.status;
  if (typeof filters.isActive === 'boolean') out.is_active = filters.isActive;
  if (typeof filters.isStaff === 'boolean') out.is_staff = filters.isStaff;
  return out;
}

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (page?: number, search?: string, filters?: Record<string, string | boolean>) =>
    filters && Object.keys(filters).length > 0
      ? ([...userKeys.lists(), { page, search, ...filters }] as const)
      : ([...userKeys.lists(), { page, search }] as const),
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
};

// Queries
export function useUsers(options?: { page?: number; search?: string; enabled?: boolean; filters?: UserListFilters }) {
  const { page, search, enabled, filters } = options || {};
  const filterParams = userFilterParams(filters);

  return useQuery<PaginatedUserList>({
    queryKey: userKeys.list(page, search, filterParams),
    queryFn: async () => {
      if (Object.keys(filterParams).length > 0) {
        // The generated usersList drops `false` booleans (is_active=false), so
        // filtered lists go through axios with explicit params.
        const response = await axios.get<PaginatedUserList>('/api/users/', {
          params: { page, search: search || undefined, ...filterParams },
        });
        return response.data;
      }
      return await usersList(
        undefined, // department
        undefined, // group
        undefined, // isActive
        undefined, // isStaff
        undefined, // lite
        undefined, // manager
        undefined, // ordering
        page,
        undefined, // pageSize
        undefined, // role
        search,
      );
    },
    // Only fetch when authenticated
    enabled: enabled !== false && authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Infinite scroll query for users
export function useInfiniteUsers(options?: { search?: string; enabled?: boolean; pageSize?: number }) {
  const { search, enabled, pageSize = 50 } = options || {};

  return useInfiniteQuery<PaginatedUserList>({
    queryKey: [...userKeys.lists(), 'infinite', { search }],
    queryFn: async ({ pageParam = 1 }) => {
      return await usersList(
        undefined, // department
        undefined, // group
        undefined, // isActive
        undefined, // isStaff
        undefined, // lite
        undefined, // manager
        undefined, // ordering
        pageParam as number,
        pageSize,
        undefined, // role
        search,
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: enabled !== false && authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCreateRequest) => usersCreate(data),
    onSuccess: () => {
      // Invalidate all user lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdateRequest }) =>
      usersUpdate(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific user and all lists
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function usePartialUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedUserUpdateRequest }) =>
      usersPartialUpdate(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific user and all lists
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersDestroy(id),
    onSuccess: (_, id) => {
      // Invalidate the specific user and all lists
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
