"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { lastMonthRange, thisMonthRange } from "./_lib/date-range";
import { useRatingStatistics, useUserChatSessions, RatingUserStats, ChatSession } from "@/hooks/api/useSocial";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { Segmented } from "@/components/redesign/segmented";
import { EmptyBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsPage, StatsPanel, settingsInputClass } from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Lock,
  Star,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  MessageSquare,
  MessageCircle,
  Clock,
  ExternalLink,
  Phone,
} from "lucide-react";

type SortField = 'name' | 'total_ratings' | 'average_rating';
type SourceFilter = 'all' | 'social' | 'calls';

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  whatsapp: 'bg-green-100 text-green-800',
  email: 'bg-gray-100 text-gray-800',
  widget: 'bg-purple-100 text-purple-800',
  phone_sms: 'bg-amber-100 text-amber-800',
  phone_callback: 'bg-violet-100 text-violet-800',
};

// Brand names stay as they are; the rest are translated (ratingStatistics.platforms.*).
const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};
const TRANSLATED_PLATFORMS = ['email', 'widget', 'phone_sms', 'phone_callback'] as const;

function isPhonePlatform(platform: string): boolean {
  return platform === 'phone_sms' || platform === 'phone_callback';
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDuration(
  start: string | null,
  end: string | null,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  if (!start || !end) return '-';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return t('durationMinutes', { minutes: diffMins });
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return t('durationHours', { hours, minutes: mins });
}

export default function RatingStatisticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("ratingStatistics");
  const isSuperAdmin = user?.is_staff === true;

  // Default date range: this month (local calendar days)
  const [startDate, setStartDate] = useState(() => thisMonthRange().start);
  const [endDate, setEndDate] = useState(() => thisMonthRange().end);
  const [sortBy, setSortBy] = useState<SortField>('average_rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [source, setSource] = useState<SourceFilter>('all');

  const { data, isLoading, error } = useRatingStatistics(startDate, endDate, source);
  const { data: sessionsData, isLoading: sessionsLoading } = useUserChatSessions(selectedUserId, startDate, endDate, source);

  // Navigate to chat conversation (only for social platforms)
  const navigateToSession = (session: ChatSession) => {
    if (isPhonePlatform(session.platform)) {
      // Phone sessions don't have a chat page to navigate to
      return;
    }
    // Build the chat ID: {platform_prefix}_{account_id}_{conversation_id}
    const platformPrefix = session.platform === 'facebook' ? 'fb' : session.platform === 'instagram' ? 'ig' : 'wa';
    const chatId = `${platformPrefix}_${session.account_id}_${session.conversation_id}`;
    setSelectedUserId(null); // Close the modal
    const viewParam = session.is_archived ? '?view=history' : '';
    router.push(`/social/messages/${chatId}${viewParam}`);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedUsers = useMemo(() => {
    if (!data?.users) return [];
    return [...data.users].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'total_ratings':
          aValue = a.total_ratings;
          bValue = b.total_ratings;
          break;
        case 'average_rating':
          aValue = a.average_rating;
          bValue = b.average_rating;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data?.users, sortBy, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ChevronsUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : star === fullStars + 1 && hasHalfStar
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getRatingBreakdownBar = (breakdown: RatingUserStats['rating_breakdown'], total: number) => {
    if (total === 0) return null;

    const colors = {
      '5': 'bg-green-500',
      '4': 'bg-green-400',
      '3': 'bg-yellow-400',
      '2': 'bg-orange-400',
      '1': 'bg-red-400',
    };

    return (
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {(['5', '4', '3', '2', '1'] as const).map((rating) => {
          const count = breakdown[rating];
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;
          return (
            <div
              key={rating}
              className={`${colors[rating]}`}
              style={{ width: `${percentage}%` }}
              title={`${rating} ${t("stars")}: ${count} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    );
  };

  const renderRatingBadge = (rating: number | null) => {
    if (rating === null) {
      return <Badge variant="secondary">{t("noRating")}</Badge>;
    }
    const colors = {
      5: 'bg-green-100 text-green-800',
      4: 'bg-green-50 text-green-700',
      3: 'bg-yellow-100 text-yellow-800',
      2: 'bg-orange-100 text-orange-800',
      1: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {rating} <Star className="h-3 w-3 ml-0.5 fill-current" />
      </Badge>
    );
  };

  const renderPlatformBadge = (session: ChatSession) => {
    const color = platformColors[session.platform] || 'bg-gray-100 text-gray-800';
    const label = (TRANSLATED_PLATFORMS as readonly string[]).includes(session.platform)
      ? t(`platforms.${session.platform}`)
      : platformLabels[session.platform] || session.platform;

    if (isPhonePlatform(session.platform)) {
      return (
        <Badge className={color}>
          <Phone className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    }

    return (
      <Badge className={color}>
        {label}
      </Badge>
    );
  };

  const rangeButtons = (
    <>
      <button
        type="button"
        className={rdButton.outlineSm}
        onClick={() => {
          const range = thisMonthRange();
          setStartDate(range.start);
          setEndDate(range.end);
        }}
      >
        {t("thisMonth")}
      </button>
      <button
        type="button"
        className={rdButton.outlineSm}
        onClick={() => {
          const range = lastMonthRange();
          setStartDate(range.start);
          setEndDate(range.end);
        }}
      >
        {t("lastMonth")}
      </button>
    </>
  );

  const columns: Column<RatingUserStats>[] = [
    {
      id: "user",
      header: (
        <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => handleSort('name')} data-testid="sort-name">
          {t("user")} {getSortIcon('name')}
        </button>
      ),
      width: "minmax(0,1.6fr)",
      mobile: "title",
      cell: (userStats) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{userStats.name}</span>
          <span className="truncate text-xs text-muted-foreground">{userStats.email}</span>
        </span>
      ),
    },
    {
      id: "total",
      header: (
        <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => handleSort('total_ratings')} data-testid="sort-total">
          {t("totalRatings")} {getSortIcon('total_ratings')}
        </button>
      ),
      width: "minmax(110px,0.8fr)",
      align: "center",
      cell: (userStats) => (
        <span className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="font-medium tabular-nums">{userStats.total_ratings}</span>
          {source === 'all' && (userStats.social_ratings != null || userStats.call_ratings != null) && (
            <>
              {userStats.social_ratings != null && userStats.social_ratings > 0 && (
                <span className="inline-flex h-5 items-center gap-0.5 rounded border bg-muted/60 px-1.5 text-[11px] text-muted-foreground" title={t("socialMedia")}>
                  <MessageSquare className="h-3 w-3" aria-hidden />
                  {userStats.social_ratings}
                </span>
              )}
              {userStats.call_ratings != null && userStats.call_ratings > 0 && (
                <span className="inline-flex h-5 items-center gap-0.5 rounded border bg-muted/60 px-1.5 text-[11px] text-muted-foreground" title={t("phoneCalls")}>
                  <Phone className="h-3 w-3" aria-hidden />
                  {userStats.call_ratings}
                </span>
              )}
            </>
          )}
        </span>
      ),
    },
    {
      id: "average",
      header: (
        <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => handleSort('average_rating')} data-testid="sort-average">
          {t("average")} {getSortIcon('average_rating')}
        </button>
      ),
      width: "150px",
      align: "center",
      mobile: "end",
      cell: (userStats) => renderStars(userStats.average_rating),
    },
    {
      id: "breakdown",
      header: t("ratingBreakdown"),
      width: "170px",
      align: "center",
      mobile: "hidden",
      cell: (userStats) => (
        <span className="flex justify-center gap-1 text-xs">
          {(['5', '4', '3', '2', '1'] as const).map((rating) => (
            <span key={rating} className="flex flex-col items-center px-1" title={`${rating} ${t("star")}`}>
              <span className="font-medium tabular-nums">{userStats.rating_breakdown[rating]}</span>
              <span className="text-muted-foreground">{rating}★</span>
            </span>
          ))}
        </span>
      ),
    },
    {
      id: "distribution",
      header: t("distribution"),
      width: "minmax(120px,1fr)",
      mobile: "meta",
      className: "w-full",
      cell: (userStats) => getRatingBreakdownBar(userStats.rating_breakdown, userStats.total_ratings),
    },
  ];

  const totalHint =
    data?.overall?.by_source && source === 'all'
      ? [
          data.overall.by_source.social ? t("socialCount", { count: data.overall.by_source.social.total }) : null,
          data.overall.by_source.calls_callback ? t("callbackCount", { count: data.overall.by_source.calls_callback.total }) : null,
          data.overall.by_source.calls_sms ? t("smsCount", { count: data.overall.by_source.calls_sms.total }) : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      : undefined;

  // Check access
  if (!isSuperAdmin) {
    return (
      <SettingsPage icon={Star} title={t("title")} width="wide" testId="rating-statistics-page">
        <div className="rounded-[10px] border bg-card" data-testid="rating-statistics-no-access">
          <EmptyBlock icon={Lock} title={t("onlySuperadmins")} />
        </div>
      </SettingsPage>
    );
  }

  if (isLoading) {
    return (
      <SettingsPage icon={Star} title={t("title")} description={t("description")} width="wide" testId="rating-statistics-page">
        <div className="flex h-64 items-center justify-center gap-2 text-[13px] text-muted-foreground" role="status">
          <Spinner className="h-5 w-5" />
          <span>{t("loadingStatistics")}</span>
        </div>
      </SettingsPage>
    );
  }

  if (error) {
    return (
      <SettingsPage icon={Star} title={t("title")} description={t("description")} width="wide" testId="rating-statistics-page">
        <div className="rounded-[10px] border bg-card" data-testid="rating-statistics-error">
          <EmptyBlock icon={AlertCircle} title={t("loadError")} />
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage icon={Star} title={t("title")} description={t("description")} width="wide" testId="rating-statistics-page">
      <StatsPanel
        toolbar={
          <div className="flex min-w-0 flex-wrap items-center gap-2" data-testid="rating-statistics-range">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xs font-medium">{t("dateRange")}</span>
            <Label htmlFor="start-date" className="sr-only">{t("sessionStart")}</Label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(settingsInputClass, "h-7 w-[136px] px-2 text-xs tabular-nums")}
            />
            <span className="text-xs text-muted-foreground">{t("to")}</span>
            <Label htmlFor="end-date" className="sr-only">{t("sessionEnd")}</Label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn(settingsInputClass, "h-7 w-[136px] px-2 text-xs tabular-nums")}
            />
            {rangeButtons}
          </div>
        }
        cards={[
          { key: "rated-users", label: t("ratedUsers"), value: data?.users?.length || 0, testId: "stat-rated-users" },
          { key: "total-ratings", label: t("totalRatings"), value: data?.overall?.total_ratings || 0, hint: totalHint, testId: "stat-total-ratings" },
          { key: "average", label: t("averageRating"), value: data?.overall?.average_rating?.toFixed(1) || '0.0', testId: "stat-average" },
          {
            key: "top",
            label: t("topRating"),
            value: data?.users && data.users.length > 0 ? Math.max(...data.users.map(u => u.average_rating)).toFixed(1) : '0.0',
            testId: "stat-top",
          },
        ]}
      >
        {/* Source Filter */}
        <Segmented
          value={source}
          onChange={setSource}
          ariaLabel={t("platform")}
          testId="rating-statistics-source"
          className="-mt-2 self-start"
          options={[
            { value: "all", label: t("allSources") },
            { value: "social", label: t("socialMedia"), icon: MessageSquare },
            { value: "calls", label: t("phoneCalls"), icon: Phone },
          ]}
        />

        {/* Statistics Table */}
        <DataTable
          variant="card"
          density="comfortable"
          columns={columns}
          rows={sortedUsers}
          rowKey={(u) => u.user_id}
          onRowClick={(u) => setSelectedUserId(u.user_id)}
          ariaLabel={t("title")}
          idPrefix="rating"
          testId="rating-statistics-table"
          empty={<div className="py-10 text-center text-[13px] text-muted-foreground">{t("noData")}</div>}
          renderError={() => <EmptyBlock icon={AlertCircle} title={t("loadError")} />}
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" data-testid="rating-legend">
          <span className="font-medium text-foreground">{t("distributionLegend")}</span>
          {([
            ['bg-green-500', `5 ${t("stars")}`],
            ['bg-green-400', `4 ${t("stars")}`],
            ['bg-yellow-400', `3 ${t("stars")}`],
            ['bg-orange-400', `2 ${t("stars")}`],
            ['bg-red-400', `1 ${t("star")}`],
          ] as const).map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", color)} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </StatsPanel>

      {/* User Sessions Modal */}
      <Dialog open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-[100vw] sm:max-w-[90vw] h-[100dvh] sm:h-[80vh] max-h-[100dvh] sm:max-h-[80vh] overflow-hidden flex flex-col rounded-none sm:rounded-lg border-0 sm:border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("chatSessions")} - {sessionsData?.user?.name || t("loading")}
            </DialogTitle>
            <DialogDescription>
              {sessionsData ? (
                <>{t("showingSessions", { count: sessionsData.total_sessions, start: sessionsData.start_date, end: sessionsData.end_date })}</>
              ) : (
                t("loadingSessions")
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {sessionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner className="h-6 w-6" />
                <span className="ml-2 text-muted-foreground">{t("loadingSessions")}</span>
              </div>
            ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
              <>
                {/* Desktop: Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("customer")}</TableHead>
                        <TableHead>{t("platform")}</TableHead>
                        <TableHead>{t("rating")}</TableHead>
                        <TableHead>{t("comment")}</TableHead>
                        <TableHead>{t("sessionStart")}</TableHead>
                        <TableHead>{t("sessionEnd")}</TableHead>
                        <TableHead>{t("duration")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionsData.sessions.map((session: ChatSession) => (
                        <TableRow
                          key={session.id}
                          className={`hover:bg-muted/50 ${isPhonePlatform(session.platform) ? '' : 'cursor-pointer'}`}
                          onClick={() => navigateToSession(session)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isPhonePlatform(session.platform) && (
                                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="font-medium">{session.customer_name}</div>
                              {!isPhonePlatform(session.platform) && (
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderPlatformBadge(session)}
                          </TableCell>
                          <TableCell>
                            {renderRatingBadge(session.rating)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px]">
                            {session.comment ? (
                              <span className="text-muted-foreground line-clamp-2" title={session.comment}>
                                {session.comment}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(session.session_started_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(session.session_ended_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.session_started_at, session.session_ended_at, t)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Cards */}
                <div className="grid gap-3 md:hidden">
                  {sessionsData.sessions.map((session: ChatSession) => (
                    <Card
                      key={session.id}
                      className={`transition-colors shadow-none ${isPhonePlatform(session.platform) ? '' : 'cursor-pointer hover:bg-muted/50'}`}
                      onClick={() => navigateToSession(session)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {isPhonePlatform(session.platform) && (
                            <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium truncate">{session.customer_name}</span>
                          {!isPhonePlatform(session.platform) && (
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {renderPlatformBadge(session)}
                          {renderRatingBadge(session.rating)}
                        </div>
                        {session.comment && (
                          <div className="mb-3 p-2 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-start gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{session.comment}</span>
                          </div>
                        )}
                        <div className="grid gap-1 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">{t("sessionStart")}:</span>{" "}
                            {formatDateTime(session.session_started_at)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{t("sessionEnd")}:</span>{" "}
                            {formatDateTime(session.session_ended_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium text-foreground">{t("duration")}:</span>{" "}
                            {formatDuration(session.session_started_at, session.session_ended_at, t)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {t("noSessions")}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedUserId(null)}>
              {t("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}
