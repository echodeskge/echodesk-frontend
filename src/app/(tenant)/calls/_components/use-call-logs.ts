"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useTranslations } from "next-intl";
import axios from "@/api/axios";
import {
  CALL_TABS,
  CALLS_PAGE_SIZE,
  agentsFromAssignments,
  tabParams,
  todaySummary,
  type CallLogRow,
  type CallTab,
} from "./calls-utils";

/** The API's max page_size (DynamicPageSizePagination). */
const TODAY_SAMPLE_SIZE = 100;

interface Page {
  results: CallLogRow[];
  count: number;
  next: string | null;
}

export interface CallLogFilters {
  tab: CallTab;
  agentId: number | null;
  search: string;
}

function baseParams(agentId: number | null, search: string): Record<string, string | number> {
  const params: Record<string, string | number> = { ordering: "-started_at" };
  if (agentId != null) params.handled_by = agentId;
  if (search) params.search = search;
  return params;
}

/** Call history pages for the current tab / agent / search ("Load more" appends). */
export function useCallLogs({ tab, agentId, search }: CallLogFilters, refreshKey: number) {
  return useInfiniteQuery({
    queryKey: ["calls", "logs", { tab, agentId, search }, refreshKey],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await axios.get<Page>("/api/call-logs/", {
        params: { ...baseParams(agentId, search), ...tabParams(tab), page: pageParam, page_size: CALLS_PAGE_SIZE },
      });
      return { results: data.results ?? [], count: data.count ?? 0, next: data.next ?? null };
    },
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    placeholderData: (prev) => prev,
  });
}

/** Count per tab for the current agent / search (one tiny request each). */
export function useCallTabCounts(agentId: number | null, search: string, refreshKey: number) {
  return useQuery({
    queryKey: ["calls", "counts", { agentId, search }, refreshKey],
    queryFn: async () => {
      const entries = await Promise.all(
        CALL_TABS.map(async (tab) => {
          const { data } = await axios.get<Page>("/api/call-logs/", {
            params: { ...baseParams(agentId, search), ...tabParams(tab), page: 1, page_size: 1 },
          });
          return [tab, data.count ?? 0] as const;
        })
      );
      return Object.fromEntries(entries) as Record<CallTab, number>;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/**
 * Today's totals for the toolbar summary. The API caps page_size at 100, so
 * the call and missed totals come from `count`; the average answered
 * duration is taken over the latest 100 of today's calls.
 */
export function useTodaySummary(refreshKey: number) {
  return useQuery({
    queryKey: ["calls", "today", refreshKey],
    queryFn: async () => {
      const since = { ordering: "-started_at", started_after: startOfDay(new Date()).toISOString() };
      const [all, missed] = await Promise.all([
        axios.get<Page>("/api/call-logs/", { params: { ...since, page: 1, page_size: TODAY_SAMPLE_SIZE } }),
        axios.get<Page>("/api/call-logs/", { params: { ...since, ...tabParams("missed"), page: 1, page_size: 1 } }),
      ]);
      const summary = todaySummary(all.data.results ?? []);
      return {
        ...summary,
        total: Math.max(summary.total, all.data.count ?? 0),
        missed: Math.max(summary.missed, missed.data.count ?? 0),
      };
    },
    staleTime: 30_000,
  });
}

/** Agents (users with a phone assignment) for the agent filter. */
export function useCallAgents() {
  const t = useTranslations("calls.page");
  return useQuery({
    queryKey: ["calls", "agents"],
    queryFn: async () => {
      const { data } = await axios.get("/api/phone-assignments/", { params: { is_active: true, page_size: TODAY_SAMPLE_SIZE } });
      return (Array.isArray(data) ? data : data?.results ?? []) as Parameters<typeof agentsFromAssignments>[0];
    },
    select: (rows) => agentsFromAssignments(rows, (ext) => t("ext", { ext })),
    staleTime: 5 * 60_000,
  });
}

/** Saves a call's notes and patches every cached page. */
export function useSaveCallNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await axios.patch(`/api/call-logs/${id}/`, { notes });
      return { id, notes };
    },
    onSuccess: ({ id, notes }) => {
      qc.setQueriesData<{ pages: Page[]; pageParams: unknown[] }>({ queryKey: ["calls", "logs"] }, (old) =>
        old
          ? { ...old, pages: old.pages.map((p) => ({ ...p, results: p.results.map((r) => (r.id === id ? { ...r, notes } : r)) })) }
          : old
      );
    },
  });
}
