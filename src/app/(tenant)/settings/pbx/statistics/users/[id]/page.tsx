"use client";

import { useMemo, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useCallStatsUserTimeline, statsKeys } from "@/hooks/usePbxQueries";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { SettingsSection, StatsPanel } from "@/components/redesign/settings";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDuration } from "@/lib/formatDuration";
import { useSettingsSubCrumb } from "../../../../_lib/settings-crumb";
import { LabeledCount, PbxBlockHeader, PbxEmpty, usePbxStates } from "../../../_components/pbx-ui";

type TimelineRow = {
  date?: string;
  day?: string;
  answered_count?: number;
  missed_count?: number;
  outbound_count?: number;
  total_talk_seconds?: number;
};

type CachedAgent = { user_id?: number; user_name?: string; user_email?: string };

/**
 * The agent's name for the header crumb, read from the statistics list /
 * overview already in the query cache (no extra request; null on a deep link).
 */
function useCachedAgentName(userId: number): string | null {
  const queryClient = useQueryClient();
  return useMemo(() => {
    for (const [, data] of queryClient.getQueriesData({ queryKey: statsKeys.all })) {
      const d = data as { results?: CachedAgent[]; top_5_users?: CachedAgent[] } | undefined;
      const list = [...(Array.isArray(d?.results) ? d!.results! : []), ...(d?.top_5_users ?? [])];
      const hit = list.find((r) => r && typeof r === "object" && r.user_id === userId);
      if (hit) return hit.user_name ?? hit.user_email ?? null;
    }
    return null;
  }, [queryClient, userId]);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function UserStatisticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const userId = Number(id);
  const searchParams = useSearchParams();
  const t = useTranslations("pbxSettings.statistics");
  const tUser = useTranslations("pbxSettings.statistics.user");

  const initialMonth = searchParams.get("month") ?? currentMonth();
  const [month, setMonth] = useState<string>(initialMonth);

  const { data, isLoading } = useCallStatsUserTimeline(userId, month);

  const rows = useMemo<TimelineRow[]>(() => {
    if (!data) return [];
    const d = data as TimelineRow[] | { results?: TimelineRow[]; timeline?: TimelineRow[] };
    if (Array.isArray(d)) return d;
    return d.results ?? d.timeline ?? [];
  }, [data]);

  const chartData = rows.map((r) => ({
    date: r.date ?? r.day ?? "",
    talk: Math.round((r.total_talk_seconds ?? 0) / 60), // minutes for readability
    answered: r.answered_count ?? 0,
  }));

  const agentName = useCachedAgentName(userId);
  useSettingsSubCrumb(agentName ?? tUser("agentFallback"));
  const { renderError, loading: loadingBlock } = usePbxStates();

  const sum = (pick: (r: TimelineRow) => number | undefined) =>
    rows.reduce((acc, r) => acc + (pick(r) ?? 0), 0);

  const columns: Column<TimelineRow>[] = [
    {
      id: "day",
      header: tUser("day"),
      width: "minmax(0,1fr)",
      mobile: "title",
      cell: (r) => <span className="font-mono text-xs tabular-nums">{r.date ?? r.day ?? "—"}</span>,
    },
    { id: "answered", header: t("columns.answered"), width: "90px", align: "end", numeric: true, cell: (r) => <LabeledCount label={t("columns.answered")} value={r.answered_count ?? 0} /> },
    { id: "missed", header: t("columns.missed"), width: "90px", align: "end", numeric: true, cell: (r) => <LabeledCount label={t("columns.missed")} value={r.missed_count ?? 0} /> },
    { id: "outbound", header: t("columns.outbound"), width: "90px", align: "end", numeric: true, cell: (r) => <LabeledCount label={t("columns.outbound")} value={r.outbound_count ?? 0} /> },
    {
      id: "talk",
      header: t("columns.totalTalk"),
      width: "100px",
      align: "end",
      mobile: "end",
      numeric: true,
      cell: (r) => formatDuration(r.total_talk_seconds),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="pbx-user-stats">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/settings/pbx/statistics"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          {tUser("backToList")}
        </Link>
        <label className="flex items-center gap-2 text-xs text-muted-foreground" htmlFor="month">
          {t("monthPicker")}
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="h-7 w-40 text-xs"
          />
        </label>
      </div>

      <PbxBlockHeader title={agentName ?? tUser("title")} description={agentName ? tUser("title") : undefined} />

      <StatsPanel
        loading={isLoading}
        cards={[
          { key: "answered", label: t("columns.answered"), value: sum((r) => r.answered_count) },
          { key: "missed", label: t("columns.missed"), value: sum((r) => r.missed_count) },
          { key: "outbound", label: t("columns.outbound"), value: sum((r) => r.outbound_count) },
          { key: "talk", label: t("columns.totalTalk"), value: formatDuration(sum((r) => r.total_talk_seconds)) },
        ]}
      />

      <SettingsSection title={t("timelineTitle")} hint={tUser("dailyTalk")}>
        <div className="px-4 py-3.5">
          {isLoading ? (
            loadingBlock
          ) : chartData.length === 0 ? (
            <PbxEmpty icon={BarChart3} text={t("empty")} />
          ) : (
            <div className="h-72" data-testid="pbx-user-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="talk"
                    name={tUser("dailyTalk")}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="answered"
                    name={tUser("dailyCalls")}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </SettingsSection>

      {rows.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3">
          <PbxBlockHeader title={tUser("dailyCalls")} />
          <DataTable
            variant="card"
            density="comfortable"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.date ?? r.day ?? ""}
            renderError={renderError}
            ariaLabel={tUser("dailyCalls")}
            idPrefix="pbx-daily"
          />
        </div>
      )}
    </div>
  );
}
