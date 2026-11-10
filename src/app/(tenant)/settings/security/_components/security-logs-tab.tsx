"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { formatShortDate } from "@/app/(tenant)/tickets/_lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  HelpCircle,
  CheckCircle,
  XCircle,
  LogOut,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { StatGrid } from "@/components/redesign/stats";
import { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/redesign/toolbar";
import { TonePill } from "@/components/redesign/pill";
import type { Tone } from "@/components/redesign/tones";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsSection } from "@/components/redesign/settings";
import { useSecurityLogs, useSecurityLogsStats } from "@/hooks/api/useSecurity";
import type { SecurityLogFilters, SecurityEventType, DeviceType, SecurityLog } from "@/types/security";

const EVENT_TYPE_ICONS: Record<SecurityEventType, React.ReactNode> = {
  login_success: <CheckCircle className="h-4 w-4 text-green-500" />,
  login_failed: <XCircle className="h-4 w-4 text-red-500" />,
  logout: <LogOut className="h-4 w-4 text-blue-500" />,
  token_expired: <Clock className="h-4 w-4 text-orange-500" />,
};

// Event labels from our catalog (the API's event_type_display is English).
const EVENT_TYPE_LABEL_KEYS: Record<SecurityEventType, string> = {
  login_success: "logs.loginSuccess",
  login_failed: "logs.loginFailed",
  logout: "logs.logout",
  token_expired: "logs.tokenExpired",
};

const EVENT_TYPE_TONES: Record<SecurityEventType, Tone> = {
  login_success: "success",
  login_failed: "danger",
  logout: "info",
  token_expired: "warning",
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

export function SecurityLogsTab() {
  const t = useTranslations('settings.security');
  const tSettings = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [filters, setFilters] = useState<SecurityLogFilters>({
    page: 1,
    page_size: 20,
  });

  const { data: logsData, isLoading, refetch } = useSecurityLogs(filters);
  const { data: statsData } = useSecurityLogsStats(30);

  const handleFilterChange = (key: keyof SecurityLogFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
      page: key === "page" ? value as number : 1, // Reset to page 1 when filters change
    }));
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({
      ...prev,
      search: value || undefined,
      page: 1,
    }));
  };

  const totalPages = logsData ? Math.ceil(logsData.count / (filters.page_size || 20)) : 0;

  const columns: Column<SecurityLog>[] = [
    {
      id: "event",
      header: t('logs.columns.event'),
      width: "minmax(0,1.3fr)",
      mobile: "title",
      cell: (log) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{EVENT_TYPE_ICONS[log.event_type]}</span>
            <TonePill tone={EVENT_TYPE_TONES[log.event_type] ?? "neutral"}>
              {EVENT_TYPE_LABEL_KEYS[log.event_type] ? t(EVENT_TYPE_LABEL_KEYS[log.event_type]) : log.event_type_display}
            </TonePill>
          </span>
          {log.failure_reason && (
            <span className="truncate text-xs text-muted-foreground" title={log.failure_reason}>
              {log.failure_reason}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "user",
      header: t('logs.columns.user'),
      width: "minmax(0,1.4fr)",
      mobile: "meta",
      cell: (log) => (
        <span className="truncate font-medium @3xl:font-medium">{log.user_email || log.attempted_email || "-"}</span>
      ),
    },
    {
      id: "ip",
      header: t('logs.columns.ip'),
      width: "minmax(0,1fr)",
      mobile: "meta",
      numeric: true,
      cell: (log) => <span className="truncate">{log.ip_address}</span>,
    },
    {
      id: "location",
      header: t('logs.columns.location'),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (log) =>
        log.city && log.country ? (
          <span className="truncate">{log.city}, {log.country}</span>
        ) : log.country ? (
          <span className="truncate">{log.country}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "device",
      header: t('logs.columns.device'),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (log) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{DEVICE_ICONS[log.device_type]}</span>
          <span className="truncate">
            {log.browser && log.operating_system
              ? `${log.browser} / ${log.operating_system}`
              : log.device_type_display}
          </span>
        </span>
      ),
    },
    {
      id: "time",
      header: t('logs.columns.time'),
      width: "112px",
      mobile: "end",
      cell: (log) => (
        <span className="flex flex-col items-end text-end @3xl:items-start @3xl:text-start">
          <span className="text-xs @3xl:text-[13px]">{formatShortDate(log.created_at, locale, { year: "always" })}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss")}</span>
        </span>
      ),
    },
  ];

  const statValue = (value: number | undefined, tone?: string) =>
    value === undefined || value === null ? "-" : <span className={tone}>{value}</span>;

  return (
    <div className="flex flex-col gap-5">
      {/* Stats Cards */}
      <StatGrid
        testId="security-stats"
        items={[
          { key: "totalLogins", label: t('stats.totalLogins'), value: statValue(statsData?.total_logins, "text-green-600 dark:text-green-400") },
          { key: "failedLogins", label: t('stats.failedLogins'), value: statValue(statsData?.failed_logins, "text-red-600 dark:text-red-400") },
          { key: "uniqueIPs", label: t('stats.uniqueIPs'), value: statValue(statsData?.unique_ips) },
          { key: "uniqueUsers", label: t('stats.uniqueUsers'), value: statValue(statsData?.unique_users) },
        ]}
      />

      <SettingsSection title={t('logs.title')} hint={t('logs.description')} testId="security-logs">
        {/* Filters */}
        <Toolbar className="py-2">
          <ToolbarSearch
            value={filters.search || ""}
            onChange={handleSearch}
            placeholder={t('logs.searchPlaceholder')}
            clearLabel={tSettings('shell.clearSearch')}
            className="max-w-none sm:max-w-[320px]"
            testId="security-logs-search"
          />
          <Select
            value={filters.event_type || "all"}
            onValueChange={(value) => handleFilterChange("event_type", value)}
          >
            <SelectTrigger className="h-7 w-full text-xs sm:w-[180px]" aria-label={t('logs.filterByType')} data-testid="security-logs-type">
              <SelectValue placeholder={t('logs.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('logs.allTypes')}</SelectItem>
              <SelectItem value="login_success">{t('logs.loginSuccess')}</SelectItem>
              <SelectItem value="login_failed">{t('logs.loginFailed')}</SelectItem>
              <SelectItem value="logout">{t('logs.logout')}</SelectItem>
              <SelectItem value="token_expired">{t('logs.tokenExpired')}</SelectItem>
            </SelectContent>
          </Select>
          <ToolbarSpacer />
          <button type="button" className={rdButton.outlineSm} onClick={() => refetch()} data-testid="security-logs-refresh">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {t('logs.refresh')}
          </button>
        </Toolbar>

        <DataTable<SecurityLog>
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={isLoading ? undefined : logsData?.results ?? []}
          loading={isLoading}
          rowKey={(log) => log.id}
          ariaLabel={t('logs.title')}
          idPrefix="security-logs"
          skeletonRows={5}
          empty={<p className="py-8 text-center text-[13px] text-muted-foreground">{t('logs.noLogs')}</p>}
          renderError={() => null}
          footer={
            logsData && logsData.count > 0 ? (
              <>
                <span className="min-w-0 flex-1 truncate">
                  {t('logs.showing', {
                    from: ((filters.page || 1) - 1) * (filters.page_size || 20) + 1,
                    to: Math.min((filters.page || 1) * (filters.page_size || 20), logsData.count),
                    total: logsData.count,
                  })}
                </span>
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  disabled={!logsData.previous}
                  onClick={() => handleFilterChange("page", (filters.page || 1) - 1)}
                  aria-label={tCommon('previous')}
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </button>
                <span className="shrink-0">
                  {t('logs.page', { current: filters.page || 1, total: totalPages })}
                </span>
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  disabled={!logsData.next}
                  onClick={() => handleFilterChange("page", (filters.page || 1) + 1)}
                  aria-label={tCommon('next')}
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </button>
              </>
            ) : undefined
          }
        />
      </SettingsSection>
    </div>
  );
}
