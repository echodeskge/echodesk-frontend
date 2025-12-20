"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRatingStatistics, useUserChatSessions, RatingUserStats, ChatSession } from "@/hooks/api/useSocial";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Star,
  Users,
  TrendingUp,
  BarChart3,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  MessageSquare,
  Clock,
  ExternalLink,
  X
} from "lucide-react";

type SortField = 'name' | 'total_ratings' | 'average_rating';

const platformColors = {
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  whatsapp: 'bg-green-100 text-green-800',
  email: 'bg-gray-100 text-gray-800',
};

const platformLabels = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export default function RatingStatisticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.is_staff === true;

  // Default date range: this month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState<SortField>('average_rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data, isLoading, error } = useRatingStatistics(startDate, endDate);
  const { data: sessionsData, isLoading: sessionsLoading } = useUserChatSessions(selectedUserId, startDate, endDate);

  // Navigate to chat conversation
  const navigateToChat = (session: ChatSession) => {
    // Build the chat ID: {platform_prefix}_{account_id}_{conversation_id}
    const platformPrefix = session.platform === 'facebook' ? 'fb' : session.platform === 'instagram' ? 'ig' : 'wa';
    const chatId = `${platformPrefix}_${session.account_id}_${session.conversation_id}`;
    setSelectedUserId(null); // Close the modal
    router.push(`/social/messages/${chatId}`);
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
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {(['5', '4', '3', '2', '1'] as const).map((rating) => {
          const count = breakdown[rating];
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;
          return (
            <div
              key={rating}
              className={`${colors[rating]}`}
              style={{ width: `${percentage}%` }}
              title={`${rating} stars: ${count} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    );
  };

  const renderRatingBadge = (rating: number | null) => {
    if (rating === null) {
      return <Badge variant="secondary">No rating</Badge>;
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

  // Check access
  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg">
              Only superadmins can view rating statistics.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Spinner className="h-6 w-6" />
            <span className="text-muted-foreground">Loading statistics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-4 bg-destructive/10 text-destructive rounded-lg">
              Failed to load rating statistics. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6 shadow-none border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Chat Rating Statistics
          </CardTitle>
          <CardDescription>
            Customer satisfaction ratings for chat sessions. Click on a user to view their chat history.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Date Range Filter */}
      <Card className="mb-6 shadow-none border border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date" className="sr-only">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Label htmlFor="end-date" className="sr-only">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(firstOfMonth.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                  setStartDate(firstOfLastMonth.toISOString().split('T')[0]);
                  setEndDate(lastOfLastMonth.toISOString().split('T')[0]);
                }}
              >
                Last Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Users className="h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {data?.users?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Rated Users
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {data?.overall?.total_ratings || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Ratings
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Star className="h-8 w-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-yellow-600">
              {data?.overall?.average_rating?.toFixed(1) || '0.0'}
            </div>
            <div className="text-sm text-muted-foreground">
              Average Rating
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {data?.users && data.users.length > 0
                ? Math.max(...data.users.map(u => u.average_rating)).toFixed(1)
                : '0.0'}
            </div>
            <div className="text-sm text-muted-foreground">
              Top Rating
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
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    User {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort('total_ratings')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Total Ratings {getSortIcon('total_ratings')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort('average_rating')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Average {getSortIcon('average_rating')}
                  </div>
                </TableHead>
                <TableHead className="text-center">Rating Breakdown</TableHead>
                <TableHead className="text-center">Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-gray-100">
              {sortedUsers.map((userStats) => (
                <TableRow
                  key={userStats.user_id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => setSelectedUserId(userStats.user_id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{userStats.name}</div>
                        <div className="text-sm text-muted-foreground">{userStats.email}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {userStats.total_ratings}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderStars(userStats.average_rating)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1 text-xs">
                      {(['5', '4', '3', '2', '1'] as const).map((rating) => (
                        <div
                          key={rating}
                          className="flex flex-col items-center px-1"
                          title={`${rating} star ratings`}
                        >
                          <span className="font-medium">{userStats.rating_breakdown[rating]}</span>
                          <span className="text-muted-foreground">{rating}★</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    {getRatingBreakdownBar(userStats.rating_breakdown, userStats.total_ratings)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {sortedUsers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No rating data available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-4 shadow-none border border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">Distribution Legend:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>5 stars</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-400" />
              <span>4 stars</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-400" />
              <span>3 stars</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-orange-400" />
              <span>2 stars</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-400" />
              <span>1 star</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Chat Sessions Modal */}
      <Dialog open={selectedUserId !== null} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Sessions - {sessionsData?.user?.name || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              {sessionsData ? (
                <>Showing {sessionsData.total_sessions} chat sessions from {sessionsData.start_date} to {sessionsData.end_date}. Click on a session to open the conversation.</>
              ) : (
                'Loading chat sessions...'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {sessionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner className="h-6 w-6" />
                <span className="ml-2 text-muted-foreground">Loading sessions...</span>
              </div>
            ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Session Start</TableHead>
                    <TableHead>Session End</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsData.sessions.map((session: ChatSession) => (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigateToChat(session)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{session.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{session.conversation_id}</div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={platformColors[session.platform]}>
                          {platformLabels[session.platform]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {renderRatingBadge(session.rating)}
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
                          {formatDuration(session.session_started_at, session.session_ended_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No chat sessions found for this user in the selected period.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedUserId(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
