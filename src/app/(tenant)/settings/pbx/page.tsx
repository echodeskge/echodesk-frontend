"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallStatsOverview,
  useTrunks,
  useQueues,
  useInboundRoutes,
} from "@/hooks/usePbxQueries";
import { Network, Route, Trophy, Users, type LucideIcon } from "lucide-react";
import { BarCell, StatsPanel, TextCell } from "@/components/redesign/settings";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { PbxBlockHeader, PbxEmpty, usePbxStates } from "./_components/pbx-ui";
import { formatDuration } from "@/lib/formatDuration";
import { answerRateOf, formatRate, weekdayName } from "./_lib/stats";

type Range = "today" | "week" | "month";

type OverviewShape = {
  total_calls?: number;
  answered_calls?: number;
  missed_calls?: number;
  inbound_calls?: number;
  outbound_calls?: number;
  answer_rate?: number;
  avg_talk_seconds?: number;
  busiest_hour?: number | null;
  busiest_weekday?: number | null;
  top_5_users?: Array<{
    user_id?: number;
    user_name?: string;
    user_email?: string;
    answered_count?: number;
    total_talk_seconds?: number;
  }>;
};

export default function PbxOverviewPage() {
  const t = useTranslations("pbxSettings.overview");
  const tSt = useTranslations("pbxSettings.statistics");
  const locale = useLocale();
  const { renderError } = usePbxStates();
  const [range, setRange] = useState<Range>("month");
  const { data, isLoading } = useCallStatsOverview(range);
  const overview = (data ?? {}) as OverviewShape;

  const { data: trunks } = useTrunks();
  const { data: queues } = useQueues();
  const { data: routes } = useInboundRoutes();

  const trunkCount = extractCount(trunks);
  const queueCount = extractCount(queues);
  const routeCount = extractCount(routes);

  const topUsers = overview.top_5_users ?? [];
  const maxTalk = Math.max(0, ...topUsers.map((u) => u.total_talk_seconds ?? 0));
  type TopUser = NonNullable<OverviewShape["top_5_users"]>[number];
  const columns: Column<TopUser>[] = [
    {
      id: "rank",
      header: "#",
      width: "32px",
      mobile: "hidden",
      numeric: true,
      muted: true,
      cell: (_u, i) => i + 1,
    },
    {
      id: "user",
      header: tSt("columns.user"),
      width: "minmax(0,1.4fr)",
      mobile: "title",
      cell: (u) => <TextCell text={u.user_name ?? u.user_email ?? "—"} strong />,
    },
    {
      id: "talk",
      header: tSt("columns.totalTalk"),
      width: "minmax(160px,1.2fr)",
      mobile: "meta",
      cell: (u) => (
        <BarCell
          value={u.total_talk_seconds ?? 0}
          max={maxTalk}
          label={formatDuration(u.total_talk_seconds)}
          ariaLabel={tSt("columns.totalTalk")}
        />
      ),
    },
    {
      id: "answered",
      header: t("answered"),
      width: "100px",
      align: "end",
      mobile: "end",
      numeric: true,
      cell: (u) => u.answered_count ?? 0,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="pbx-overview">
      <StatsPanel<Range>
        ranges={[
          { value: "today", label: t("rangeToday") },
          { value: "week", label: t("rangeWeek") },
          { value: "month", label: t("rangeMonth") },
        ]}
        range={range}
        onRangeChange={setRange}
        rangeAriaLabel={t("rangeLabel")}
        loading={isLoading}
        cards={[
          { key: "total", label: t("totalCalls"), value: overview.total_calls ?? 0 },
          { key: "answered", label: t("answered"), value: overview.answered_calls ?? 0 },
          { key: "missed", label: t("missed"), value: overview.missed_calls ?? 0 },
          { key: "rate", label: t("answerRate"), value: formatRate(answerRateOf(overview)) },
          { key: "inbound", label: t("inboundCalls"), value: overview.inbound_calls ?? 0 },
          { key: "outbound", label: t("outboundCalls"), value: overview.outbound_calls ?? 0 },
          { key: "avg", label: t("avgTalk"), value: formatDuration(overview.avg_talk_seconds) },
          {
            key: "hour",
            label: t("busiestHour"),
            value:
              overview.busiest_hour == null
                ? "—"
                : `${String(overview.busiest_hour).padStart(2, "0")}:00`,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" data-testid="pbx-overview-config">
        <ConfigCard icon={Network} label={t("trunks")} value={trunkCount} />
        <ConfigCard icon={Users} label={t("queues")} value={queueCount} />
        <ConfigCard icon={Route} label={t("routes")} value={routeCount} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <PbxBlockHeader
          title={t("topUsersTitle")}
          description={
            overview.busiest_weekday != null ? (
              <span data-testid="pbx-busiest-day">
                {t("busiestDay")}: {weekdayName(overview.busiest_weekday, locale)}
              </span>
            ) : undefined
          }
        />
        <DataTable
          variant="card"
          density="comfortable"
          columns={columns}
          rows={isLoading ? undefined : topUsers}
          rowKey={(u) => u.user_id ?? u.user_email ?? ""}
          loading={isLoading}
          renderError={renderError}
          empty={<PbxEmpty icon={Trophy} text={t("noData")} />}
          ariaLabel={t("topUsersTitle")}
          idPrefix="pbx-top"
          skeletonRows={3}
        />
      </div>
    </div>
  );
}

/** HOME-style card (34px icon tile, 13px label) with the live count. */
function ConfigCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border bg-card px-3.5 py-3.5">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{label}</span>
      <span className="text-xl font-semibold tabular-nums tracking-[-.02em]">{value}</span>
    </div>
  );
}

function extractCount(data: unknown): number {
  if (!data) return 0;
  const d = data as { count?: number; results?: unknown[] } | unknown[];
  if (Array.isArray(d)) return d.length;
  if (typeof d.count === "number") return d.count;
  if (Array.isArray(d.results)) return d.results.length;
  return 0;
}
