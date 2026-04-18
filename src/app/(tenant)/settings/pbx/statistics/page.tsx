"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallStatsOverview, useCallStatsUsers } from "@/hooks/usePbxQueries";
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
import { formatDuration } from "@/lib/formatDuration";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase text-muted-foreground">
              {tOverview("totalCalls")}
            </div>
            <div className="mt-2 text-2xl font-semibold">{overview.total_calls ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase text-muted-foreground">
              {tOverview("answered")}
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {overview.answered_calls ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase text-muted-foreground">
              {tOverview("missed")}
            </div>
            <div className="mt-2 text-2xl font-semibold">{overview.missed_calls ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs uppercase text-muted-foreground">
              {tOverview("answerRate")}
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {overview.answer_rate == null
                ? "—"
                : `${Math.round(overview.answer_rate * 100)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{t("leaderboardTitle")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.user")}</TableHead>
                  <TableHead className="text-right">{t("columns.answered")}</TableHead>
                  <TableHead className="text-right">{t("columns.missed")}</TableHead>
                  <TableHead className="text-right">{t("columns.outbound")}</TableHead>
                  <TableHead className="text-right">{t("columns.totalTalk")}</TableHead>
                  <TableHead className="text-right">{t("columns.avgTalk")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.user_id ?? i}>
                    <TableCell>
                      {r.user_id ? (
                        <Link
                          href={`/settings/pbx/statistics/users/${r.user_id}?month=${month}`}
                          className="hover:underline"
                        >
                          {r.user_name ?? r.user_email ?? "—"}
                        </Link>
                      ) : (
                        r.user_name ?? r.user_email ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.answered_count ?? 0}</TableCell>
                    <TableCell className="text-right">{r.missed_count ?? 0}</TableCell>
                    <TableCell className="text-right">{r.outbound_count ?? 0}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(r.total_talk_seconds)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(r.avg_talk_seconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
