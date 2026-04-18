"use client";

import { useMemo, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useCallStatsUserTimeline } from "@/hooks/usePbxQueries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type TimelineRow = {
  date?: string;
  day?: string;
  answered_count?: number;
  missed_count?: number;
  outbound_count?: number;
  total_talk_seconds?: number;
};

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/settings/pbx/statistics"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tUser("backToList")}
        </Link>
        <div className="space-y-1">
          <Label htmlFor="month" className="text-xs">
            {t("monthPicker")}
          </Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="w-40"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("timelineTitle")}</CardTitle>
          <CardDescription>{tUser("dailyTalk")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">…</p>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">{t("empty")}</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="talk"
                    name={tUser("dailyTalk")}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="answered"
                    name={tUser("dailyCalls")}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tUser("dailyCalls")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tUser("day")}</TableHead>
                  <TableHead className="text-right">{t("columns.answered")}</TableHead>
                  <TableHead className="text-right">{t("columns.missed")}</TableHead>
                  <TableHead className="text-right">{t("columns.outbound")}</TableHead>
                  <TableHead className="text-right">{t("columns.totalTalk")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.date ?? r.day ?? i}>
                    <TableCell className="font-mono text-xs">
                      {r.date ?? r.day ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{r.answered_count ?? 0}</TableCell>
                    <TableCell className="text-right">{r.missed_count ?? 0}</TableCell>
                    <TableCell className="text-right">{r.outbound_count ?? 0}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(r.total_talk_seconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
