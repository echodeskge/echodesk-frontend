"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
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
import { useSecurityLogs, useSecurityLogsStats } from "@/hooks/api/useSecurity";
import type { SecurityLogFilters, SecurityEventType, DeviceType, SecurityLog } from "@/types/security";

const EVENT_TYPE_ICONS: Record<SecurityEventType, React.ReactNode> = {
  login_success: <CheckCircle className="h-4 w-4 text-green-500" />,
  login_failed: <XCircle className="h-4 w-4 text-red-500" />,
  logout: <LogOut className="h-4 w-4 text-blue-500" />,
  token_expired: <Clock className="h-4 w-4 text-orange-500" />,
};

const EVENT_TYPE_COLORS: Record<SecurityEventType, string> = {
  login_success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  login_failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  logout: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  token_expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

export function SecurityLogsTab() {
  const t = useTranslations('settings.security');
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.totalLogins')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsData?.total_logins ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.failedLogins')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsData?.failed_logins ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.uniqueIPs')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.unique_ips ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.uniqueUsers')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.unique_users ?? "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('logs.title')}</CardTitle>
          <CardDescription>{t('logs.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('logs.searchPlaceholder')}
                  value={filters.search || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={filters.event_type || "all"}
              onValueChange={(value) => handleFilterChange("event_type", value)}
            >
              <SelectTrigger className="w-[180px]">
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
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('logs.refresh')}
            </Button>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('logs.columns.event')}</TableHead>
                  <TableHead>{t('logs.columns.user')}</TableHead>
                  <TableHead>{t('logs.columns.ip')}</TableHead>
                  <TableHead>{t('logs.columns.location')}</TableHead>
                  <TableHead>{t('logs.columns.device')}</TableHead>
                  <TableHead>{t('logs.columns.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : logsData?.results?.length ? (
                  logsData.results.map((log: SecurityLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {EVENT_TYPE_ICONS[log.event_type]}
                          <Badge className={EVENT_TYPE_COLORS[log.event_type]}>
                            {log.event_type_display}
                          </Badge>
                        </div>
                        {log.failure_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.failure_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.user_email || log.attempted_email || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">
                          {log.ip_address}
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.city && log.country ? (
                          <span>{log.city}, {log.country}</span>
                        ) : log.country ? (
                          <span>{log.country}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {DEVICE_ICONS[log.device_type]}
                          <span className="text-sm">
                            {log.browser && log.operating_system
                              ? `${log.browser} / ${log.operating_system}`
                              : log.device_type_display}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(log.created_at), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm:ss")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('logs.noLogs')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {logsData && logsData.count > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('logs.showing', {
                  from: ((filters.page || 1) - 1) * (filters.page_size || 20) + 1,
                  to: Math.min((filters.page || 1) * (filters.page_size || 20), logsData.count),
                  total: logsData.count,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!logsData.previous}
                  onClick={() => handleFilterChange("page", (filters.page || 1) - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {t('logs.page', { current: filters.page || 1, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!logsData.next}
                  onClick={() => handleFilterChange("page", (filters.page || 1) + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
