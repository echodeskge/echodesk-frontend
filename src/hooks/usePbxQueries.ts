"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  trunksList,
  trunksCreate,
  trunksRetrieve,
  trunksUpdate,
  trunksPartialUpdate,
  trunksDestroy,
  queuesList,
  queuesCreate,
  queuesRetrieve,
  queuesUpdate,
  queuesPartialUpdate,
  queuesDestroy,
  queueMembersList,
  inboundRoutesList,
  inboundRoutesCreate,
  inboundRoutesRetrieve,
  inboundRoutesUpdate,
  inboundRoutesPartialUpdate,
  inboundRoutesDestroy,
  callStatsOverviewRetrieve,
  callStatsUsersRetrieve,
  callStatsUsersTimelineRetrieve,
  callStatsQueuesRetrieve,
} from "@/api/generated/api";
import type {
  TrunkRequest,
  PatchedTrunkRequest,
  QueueRequest,
  PatchedQueueRequest,
  InboundRouteRequest,
  PatchedInboundRouteRequest,
} from "@/api/generated/interfaces";

export const trunkKeys = {
  all: ["trunks"] as const,
  lists: () => [...trunkKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...trunkKeys.lists(), filters ?? {}] as const,
  details: () => [...trunkKeys.all, "detail"] as const,
  detail: (id: number) => [...trunkKeys.details(), id] as const,
};

export const queueKeys = {
  all: ["queues"] as const,
  lists: () => [...queueKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...queueKeys.lists(), filters ?? {}] as const,
  details: () => [...queueKeys.all, "detail"] as const,
  detail: (id: number) => [...queueKeys.details(), id] as const,
  members: (queueId: number) => [...queueKeys.all, "members", queueId] as const,
};

export const inboundRouteKeys = {
  all: ["inbound-routes"] as const,
  lists: () => [...inboundRouteKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...inboundRouteKeys.lists(), filters ?? {}] as const,
  details: () => [...inboundRouteKeys.all, "detail"] as const,
  detail: (id: number) => [...inboundRouteKeys.details(), id] as const,
};

export const statsKeys = {
  all: ["call-stats"] as const,
  overview: (range?: string) => [...statsKeys.all, "overview", range ?? "month"] as const,
  users: (month?: string) => [...statsKeys.all, "users", month ?? "current"] as const,
  userTimeline: (userId: number, month?: string) =>
    [...statsKeys.all, "user-timeline", userId, month ?? "current"] as const,
  queues: (queueId: number, range?: string) =>
    [...statsKeys.all, "queues", queueId, range ?? "month"] as const,
};

export function useTrunks() {
  return useQuery({
    queryKey: trunkKeys.list(),
    queryFn: () => trunksList(),
  });
}

export function useTrunk(id: number | null) {
  return useQuery({
    queryKey: trunkKeys.detail(id ?? 0),
    queryFn: () => trunksRetrieve(id!),
    enabled: id != null,
  });
}

export function useCreateTrunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TrunkRequest) => trunksCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trunkKeys.lists() });
    },
  });
}

export function useUpdateTrunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedTrunkRequest }) =>
      trunksPartialUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trunkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trunkKeys.detail(variables.id) });
    },
  });
}

export function useReplaceTrunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TrunkRequest }) => trunksUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trunkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trunkKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTrunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trunksDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trunkKeys.lists() });
    },
  });
}

export function useQueues() {
  return useQuery({
    queryKey: queueKeys.list(),
    queryFn: () => queuesList(),
  });
}

export function useQueue(id: number | null) {
  return useQuery({
    queryKey: queueKeys.detail(id ?? 0),
    queryFn: () => queuesRetrieve(id!),
    enabled: id != null,
  });
}

export function useCreateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QueueRequest) => queuesCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
  });
}

export function useUpdateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedQueueRequest }) =>
      queuesPartialUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(variables.id) });
    },
  });
}

export function useReplaceQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QueueRequest }) => queuesUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(variables.id) });
    },
  });
}

export function useDeleteQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => queuesDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists() });
    },
  });
}

export function useQueueMembers(queueId: number | null) {
  return useQuery({
    queryKey: queueKeys.members(queueId ?? 0),
    queryFn: () => queueMembersList(),
    enabled: queueId != null,
  });
}

export function useInboundRoutes() {
  return useQuery({
    queryKey: inboundRouteKeys.list(),
    queryFn: () => inboundRoutesList(),
  });
}

export function useInboundRoute(id: number | null) {
  return useQuery({
    queryKey: inboundRouteKeys.detail(id ?? 0),
    queryFn: () => inboundRoutesRetrieve(id!),
    enabled: id != null,
  });
}

export function useCreateInboundRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InboundRouteRequest) => inboundRoutesCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.lists() });
    },
  });
}

export function useUpdateInboundRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedInboundRouteRequest }) =>
      inboundRoutesPartialUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.detail(variables.id) });
    },
  });
}

export function useReplaceInboundRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InboundRouteRequest }) =>
      inboundRoutesUpdate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.detail(variables.id) });
    },
  });
}

export function useDeleteInboundRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inboundRoutesDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboundRouteKeys.lists() });
    },
  });
}

export function useCallStatsOverview(range: "today" | "week" | "month" = "month") {
  return useQuery({
    queryKey: statsKeys.overview(range),
    queryFn: () => callStatsOverviewRetrieve(range),
  });
}

export function useCallStatsUsers(month?: string) {
  return useQuery({
    queryKey: statsKeys.users(month),
    queryFn: () => callStatsUsersRetrieve(month),
  });
}

export function useCallStatsUserTimeline(userId: number | null, month?: string) {
  return useQuery({
    queryKey: statsKeys.userTimeline(userId ?? 0, month),
    queryFn: () => callStatsUsersTimelineRetrieve(userId!, month),
    enabled: userId != null,
  });
}

export function useCallStatsQueue(queueId: number | null, range: "today" | "week" | "month" = "month") {
  return useQuery({
    queryKey: statsKeys.queues(queueId ?? 0, range),
    queryFn: () => callStatsQueuesRetrieve(queueId!, range),
    enabled: queueId != null,
  });
}
