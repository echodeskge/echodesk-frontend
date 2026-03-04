"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { usersList, usersCreate, usersUpdate, usersPartialUpdate, usersDestroy } from '@/api/generated/api';
import type { PaginatedUserList, UserCreateRequest, UserUpdateRequest, PatchedUserUpdateRequest, UserCreate, UserUpdate } from '@/api/generated/interfaces';
import { authService } from '@/services/auth';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (page?: number, search?: string) => [...userKeys.lists(), { page, search }] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
};

// Queries
export function useUsers(options?: { page?: number; search?: string; enabled?: boolean }) {
  const { page, search, enabled } = options || {};

  return useQuery<PaginatedUserList>({
    queryKey: userKeys.list(page, search),
    queryFn: async () => {
      return await usersList(undefined, page, undefined, search);
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
      return await usersList(undefined, pageParam as number, pageSize, search);
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
