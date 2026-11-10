"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { useCallStatsOverview, useCallStatsUsers } from "@/hooks/usePbxQueries";
import { Input } from "@/components/ui/input";
import type { Column } from "@/components/redesign/data-table";
import { DataTable } from "@/components/redesign/data-table";
import { BarCell, StatsPanel } from "@/components/redesign/settings";
import { formatDuration } from "@/lib/formatDuration";
import { answerRateOf, formatRate } from "../_lib/stats";
import { PbxBlockHeader, PbxEmpty, usePbxStates } from "../_components/pbx-ui";
type UserStatsRow = {
  user_id?: number;
  user_name?: string;
  user_email?: string;
  answered_count?: number;
  missed_count?: number;
  outbound_count?: number;
  total_talk_seconds?: number;
  avg_talk_seconds?: number;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PbxStatisticsPage() {
  const t = useTranslations("pbxSettings.statistics");
  const tOverview = useTranslations("pbxSettings.overview");
  const [month, setMonth] = useState<string>(currentMonth());

  const { data: overviewData } = useCallStatsOverview("month");
  const { data: usersData, isLoading } = useCallStatsUsers(month);

  const rows = useMemo<UserStatsRow[]>(() => {
    if (!usersData) return [];
    const d = usersData as UserStatsRow[] | { results?: UserStatsRow[] };
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [usersData]);

  const overview = (overviewData ?? {}) as {
    total_calls?: number;
    answered_calls?: number;
    missed_calls?: number;
    answer_rate?: number;
  };

  const { renderError } = usePbxStates();
  const maxTalk = Math.max(0, ...rows.map((r) => r.total_talk_seconds ?? 0));
  const nameOf = (r: UserStatsRow) => r.user_name ?? r.user_email ?? "—";

  const columns: Column<UserStatsRow>[] = [
    {
      id: "user",
      header: t("columns.user"),
      width: "minmax(0,1.4fr)",
      mobile: "title",
      cell: (r) =>
        r.user_id ? (
          <Link
            href={`/settings/pbx/statistics/users/${r.user_id}?month=${month}`}
            className="truncate font-medium hover:underline"
          >
            {nameOf(r)}
          </Link>
        ) : (
          <span className="truncate font-medium">{nameOf(r)}</span>
        ),
    },
    { id: "answered", header: t("columns.answered"), width: "84px", align: "end", numeric: true, cell: (r) => r.answered_count ?? 0 },
    { id: "missed", header: t("columns.missed"), width: "84px", align: "end", numeric: true, cell: (r) => r.missed_count ?? 0 },
    { id: "outbound", header: t("columns.outbound"), width: "84px", align: "end", numeric: true, cell: (r) => r.outbound_count ?? 0 },
    {
      id: "totalTalk",
      header: t("columns.totalTalk"),
      width: "minmax(150px,1.1fr)",
      mobile: "end",
      cell: (r) => (
        <BarCell
          value={r.total_talk_seconds ?? 0}
          max={maxTalk}
          label={formatDuration(r.total_talk_seconds)}
          ariaLabel={t("columns.totalTalk")}
        />
      ),
    },
    {
      id: "avgTalk",
      header: t("columns.avgTalk"),
      width: "84px",
      align: "end",
      numeric: true,
      cell: (r) => formatDuration(r.avg_talk_seconds),
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="pbx-statistics">
      <PbxBlockHeader title={t("title")} description={t("description")} />

      <StatsPanel
        cards={[
          { key: "total", label: tOverview("totalCalls"), value: overview.total_calls ?? 0 },
          { key: "answered", label: tOverview("answered"), value: overview.answered_calls ?? 0 },
          { key: "missed", label: tOverview("missed"), value: overview.missed_calls ?? 0 },
          { key: "rate", label: tOverview("answerRate"), value: formatRate(answerRateOf(overview)) },
        ]}
      />

      <div className="flex min-w-0 flex-col gap-3">
        <PbxBlockHeader
          title={t("leaderboardTitle")}
          description={t("description")}
          action={
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
          }
        />
        <DataTable
          variant="card"
          density="comfortable"
          columns={columns}
          rows={isLoading ? undefined : rows}
          rowKey={(r) => r.user_id ?? r.user_email ?? ""}
          loading={isLoading}
          renderError={renderError}
          empty={<PbxEmpty icon={BarChart3} text={t("empty")} />}
          ariaLabel={t("leaderboardTitle")}
          idPrefix="pbx-leaderboard"
          skeletonRows={4}
        />
      </div>
    </div>
  );
}
