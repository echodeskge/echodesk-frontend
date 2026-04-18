"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useCallStatsOverview,
  useTrunks,
  useQueues,
  useInboundRoutes,
} from "@/hooks/usePbxQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDuration } from "@/lib/formatDuration";

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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PbxOverviewPage() {
  const t = useTranslations("pbxSettings.overview");
  const [range, setRange] = useState<Range>("month");
  const { data, isLoading } = useCallStatsOverview(range);
  const overview = (data ?? {}) as OverviewShape;

  const { data: trunks } = useTrunks();
  const { data: queues } = useQueues();
  const { data: routes } = useInboundRoutes();

  const trunkCount = extractCount(trunks);
  const queueCount = extractCount(queues);
  const routeCount = extractCount(routes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">{t("rangeLabel")}</span>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t("rangeToday")}</SelectItem>
            <SelectItem value="week">{t("rangeWeek")}</SelectItem>
            <SelectItem value="month">{t("rangeMonth")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("totalCalls")} value={overview.total_calls ?? 0} loading={isLoading} />
        <StatCard label={t("answered")} value={overview.answered_calls ?? 0} loading={isLoading} />
        <StatCard label={t("missed")} value={overview.missed_calls ?? 0} loading={isLoading} />
        <StatCard
          label={t("answerRate")}
          value={formatRate(overview.answer_rate)}
          loading={isLoading}
        />
        <StatCard label={t("inboundCalls")} value={overview.inbound_calls ?? 0} loading={isLoading} />
        <StatCard
          label={t("outboundCalls")}
          value={overview.outbound_calls ?? 0}
          loading={isLoading}
        />
        <StatCard
          label={t("avgTalk")}
          value={formatDuration(overview.avg_talk_seconds)}
          loading={isLoading}
        />
        <StatCard
          label={t("busiestHour")}
          value={
            overview.busiest_hour == null
              ? "—"
              : `${String(overview.busiest_hour).padStart(2, "0")}:00`
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={t("trunks")} value={trunkCount} loading={false} />
        <StatCard label={t("queues")} value={queueCount} loading={false} />
        <StatCard label={t("routes")} value={routeCount} loading={false} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("topUsersTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(overview.top_5_users?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <ul className="divide-y">
              {overview.top_5_users!.map((u, i) => (
                <li
                  key={u.user_id ?? i}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {u.user_name ?? u.user_email ?? "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDuration(u.total_talk_seconds)} ·{" "}
                    <span className="text-foreground">{u.answered_count ?? 0}</span>{" "}
                    {t("answered").toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {overview.busiest_weekday != null && (
        <p className="text-xs text-muted-foreground">
          {t("busiestDay")}: {WEEKDAYS[overview.busiest_weekday] ?? "—"}
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold">{loading ? "…" : value}</div>
      </CardContent>
    </Card>
  );
}

function formatRate(r: number | undefined): string {
  if (r == null || isNaN(r)) return "—";
  return `${Math.round(r * 100)}%`;
}

function extractCount(data: unknown): number {
  if (!data) return 0;
  const d = data as { count?: number; results?: unknown[] } | unknown[];
  if (Array.isArray(d)) return d.length;
  if (typeof d.count === "number") return d.count;
  if (Array.isArray(d.results)) return d.results.length;
  return 0;
}
