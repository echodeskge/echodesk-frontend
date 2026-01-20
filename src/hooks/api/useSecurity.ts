"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSecurityLogs,
  securityLogsStats,
  mySecurityLogs,
  listIpWhitelist,
  createIpWhitelist,
  manageIpWhitelist,
  manageIpWhitelist2,
  manageIpWhitelist3,
  toggleIpWhitelist,
  getCurrentIp,
} from '@/api/generated/api';
import type { TenantIpwhitelistRequest, PatchedTenantIpwhitelistRequest } from '@/api/generated/interfaces';
import type {
  SecurityLogFilters,
  PaginatedSecurityLogs,
  SecurityLogStats,
  IPWhitelistSettings,
  IPWhitelistToggleRequest,
  IPWhitelistToggleResponse,
  CurrentIPInfo,
  IPWhitelistEntry,
} from '@/types/security';
import { authService } from '@/services/auth';
import axios from '@/api/axios';

// Query keys
export const securityKeys = {
  all: ['security'] as const,
  logs: () => [...securityKeys.all, 'logs'] as const,
  logsList: (filters: SecurityLogFilters) => [...securityKeys.logs(), 'list', filters] as const,
  logsStats: (days?: number) => [...securityKeys.logs(), 'stats', days] as const,
  myLogs: (page?: number) => [...securityKeys.logs(), 'my', page] as const,
  whitelist: () => [...securityKeys.all, 'whitelist'] as const,
  currentIp: () => [...securityKeys.all, 'currentIp'] as const,
};

// Security Logs Queries
export function useSecurityLogs(filters: SecurityLogFilters = {}, options?: { enabled?: boolean }) {
  return useQuery<PaginatedSecurityLogs>({
    queryKey: securityKeys.logsList(filters),
    queryFn: async () => {
      const response = await listSecurityLogs(
        filters.date_from,
        filters.date_to,
        filters.event_type,
        filters.ip_address,
        filters.page,
        filters.page_size,
        filters.search,
        filters.user_id
      );
      return response as PaginatedSecurityLogs;
    },
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSecurityLogsStats(days: number = 30, options?: { enabled?: boolean }) {
  return useQuery<SecurityLogStats>({
    queryKey: securityKeys.logsStats(days),
    queryFn: async () => {
      const response = await securityLogsStats(days);
      return response as SecurityLogStats;
    },
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMySecurityLogs(page: number = 1, options?: { enabled?: boolean }) {
  return useQuery<PaginatedSecurityLogs>({
    queryKey: securityKeys.myLogs(page),
    queryFn: async () => {
      const response = await mySecurityLogs(page, 20);
      return response as PaginatedSecurityLogs;
    },
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// IP Whitelist Queries
export function useIPWhitelist(options?: { enabled?: boolean }) {
  return useQuery<IPWhitelistSettings>({
    queryKey: securityKeys.whitelist(),
    queryFn: async () => {
      const response = await listIpWhitelist();
      return response as IPWhitelistSettings;
    },
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCurrentIP(options?: { enabled?: boolean }) {
  return useQuery<CurrentIPInfo>({
    queryKey: securityKeys.currentIp(),
    queryFn: async () => {
      const response = await getCurrentIp();
      return response as CurrentIPInfo;
    },
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes - IP doesn't change often
    gcTime: 10 * 60 * 1000,
  });
}

// IP Whitelist Mutations
export function useCreateIPWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TenantIpwhitelistRequest) => createIpWhitelist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.whitelist() });
    },
  });
}

export function useUpdateIPWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedTenantIpwhitelistRequest }) =>
      manageIpWhitelist2(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.whitelist() });
    },
  });
}

export function useDeleteIPWhitelist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => manageIpWhitelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.whitelist() });
    },
  });
}

export function useToggleIPWhitelist() {
  const queryClient = useQueryClient();

  return useMutation<IPWhitelistToggleResponse, Error, IPWhitelistToggleRequest>({
    mutationFn: async (data: IPWhitelistToggleRequest) => {
      // The generated API doesn't accept body, so we need to call manually
      const response = await axios.post('/api/security/ip-whitelist/toggle/', data);
      return response.data as IPWhitelistToggleResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.whitelist() });
    },
  });
}
