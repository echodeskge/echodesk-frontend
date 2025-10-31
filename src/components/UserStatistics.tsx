'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatDuration } from './TimeTracking';
import { apiUsersList, apiTimeLogsList } from '@/api/generated';
import { User, TicketTimeLog } from '@/api/generated/interfaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronUp, ChevronDown, ChevronsUpDown, BarChart3, Clock, Users, TrendingUp } from 'lucide-react';

interface UserTimeStats {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  today: number;
  this_week: number;
  last_week: number;
  this_month: number;
  last_month: number;
  past_month: number;
  avg_daily_this_month: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface UserStatisticsProps {
  className?: string;
}

export default function UserStatistics({ className }: UserStatisticsProps) {
  const t = useTranslations("userStatistics");
  const tCommon = useTranslations("common");
  const [data, setData] = useState<UserTimeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<keyof UserTimeStats>('this_week');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get start of week (Monday) and end of week (Friday)
    const startOfWeek = new Date(today);
    const dayOfWeek = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get start of last week (Monday to Friday)
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 4); // Friday
    endOfLastWeek.setHours(23, 59, 59, 999);
    
    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Get start of month before last
    const startOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
    
    return {
      today: { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
      thisWeek: { start: startOfWeek, end: Math.min(now.getTime(), endOfWeek.getTime()) > endOfWeek.getTime() ? endOfWeek : now },
      lastWeek: { start: startOfLastWeek, end: endOfLastWeek },
      thisMonth: { start: startOfMonth, end: now },
      lastMonth: { start: startOfLastMonth, end: endOfLastMonth },
      pastMonth: { start: startOfPastMonth, end: endOfPastMonth }
    };
  };

  const aggregateTimeByUserAndPeriod = (timeLogs: TicketTimeLog[], users: User[]) => {
    const ranges = getDateRanges();
    const now = new Date();
    
    const userStats: UserTimeStats[] = users.map(user => {
      const userLogs = timeLogs.filter(log => log.user.id === user.id);
      
      const calculateTimeForRange = (range: DateRange) => {
        return userLogs
          .filter(log => {
            const enteredAt = new Date(log.entered_at);
            return enteredAt >= range.start && enteredAt <= range.end;
          })
          .reduce((total, log) => total + (log.duration_seconds || 0), 0);
      };

      // Calculate average daily time this month
      const thisMonthTime = calculateTimeForRange(ranges.thisMonth);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysSinceStartOfMonth = Math.floor((now.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const avgDailyThisMonth = daysSinceStartOfMonth > 0 ? thisMonthTime / daysSinceStartOfMonth : 0;

      return {
        user_id: user.id,
        username: user.email.split('@')[0], // Use email prefix as username since User doesn't have username field
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
        today: calculateTimeForRange(ranges.today),
        this_week: calculateTimeForRange(ranges.thisWeek),
        last_week: calculateTimeForRange(ranges.lastWeek),
        this_month: thisMonthTime,
        last_month: calculateTimeForRange(ranges.lastMonth),
        past_month: calculateTimeForRange(ranges.pastMonth),
        avg_daily_this_month: Math.floor(avgDailyThisMonth),
      };
    });

    return userStats;
  };

  const fetchAllTimeLogs = async () => {
    const allTimeLogs: TicketTimeLog[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await apiTimeLogsList(undefined, page);
      allTimeLogs.push(...response.results);

      hasMore = !!response.next;
      page++;
    }

    return allTimeLogs;
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch users and all time logs in parallel
      const [usersResponse, allTimeLogs] = await Promise.all([
        apiUsersList(),
        fetchAllTimeLogs()
      ]);

      // Filter time logs to only include those from columns with track_time enabled
      const trackingTimeLogs = allTimeLogs.filter(log =>
        log.column && log.column.track_time
      );

      const userStats = aggregateTimeByUserAndPeriod(trackingTimeLogs, usersResponse.results);
      setData(userStats);

    } catch (err) {
      console.error('Error fetching user statistics:', err);
      setError('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (column: keyof UserTimeStats) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Spinner className="h-6 w-6" />
            <span className="text-muted-foreground">{t("loadingStatistics")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSortIcon = (column: keyof UserTimeStats) => {
    if (sortBy !== column) return <ChevronsUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      {/* Header */}
      <Card className="mb-6 shadow-none border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            {t("userTimeTrackingStatistics")}
          </CardTitle>
          <CardDescription>
            {t("timeTrackingOverview")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Users className="h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {data.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("activeUsers")}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Clock className="h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-green-600 font-mono">
              {formatDuration(data.reduce((sum, user) => sum + user.this_week, 0))}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("totalThisWeek")}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <TrendingUp className="h-8 w-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-yellow-600 font-mono">
              {data.length > 0 ? formatDuration(Math.floor(data.reduce((sum, user) => sum + user.this_week, 0) / data.length)) : '0s'}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("averageThisWeek")}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-purple-600 font-mono">
              {data.length > 0 ? formatDuration(Math.floor(data.reduce((sum, user) => sum + user.avg_daily_this_month, 0) / data.length)) : '0s'}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("teamAvgDaily")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Table */}
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="[&_tr]:border-b [&_tr]:border-gray-100">
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('full_name')}
                >
                  <div className="flex items-center gap-2">
                    {t("user")} {getSortIcon('full_name')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('today')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("today")} {getSortIcon('today')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('this_week')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("thisWeek")} {getSortIcon('this_week')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('last_week')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("lastWeek")} {getSortIcon('last_week')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('this_month')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("thisMonth")} {getSortIcon('this_month')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('last_month')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("lastMonth")} {getSortIcon('last_month')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('past_month')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("pastMonth")} {getSortIcon('past_month')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('avg_daily_this_month')}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t("avgDaily")} {getSortIcon('avg_daily_this_month')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-gray-100">
              {sortedData.map((user) => (
                <TableRow key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(user.today)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-blue-600">
                    {formatDuration(user.this_week)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatDuration(user.last_week)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-green-600">
                    {formatDuration(user.this_month)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatDuration(user.last_month)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatDuration(user.past_month)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-purple-600">
                    {formatDuration(user.avg_daily_this_month)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              {t("noUserData")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info about data source */}
      <Card className="mt-4 shadow-none border border-gray-200">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {t("infoMessage")}
          </p>
        </CardContent>
      </Card>

    </div>
  );
}