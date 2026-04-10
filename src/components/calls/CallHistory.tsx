"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, RefreshCw, Search, Star } from "lucide-react";
import { format } from "date-fns";
import { callLogsList } from "@/api/generated/api";
import { useCall } from "@/contexts/CallContext";

interface CallLog {
  id: number;
  call_id: string;
  caller_number: string;
  recipient_number: string;
  direction: "inbound" | "outbound";
  call_type: string;
  status: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration: string | null;
  duration_display: string | null;
  handled_by_name: string | null;
  call_quality_score: number | null;
  client_name: string | null;
  sip_config_name: string | null;
}

export function CallHistory() {
  const t = useTranslations("calls");
  const { callEndedCounter, setDialNumber, setIsDialpadOpen } = useCall();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCallLogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const params: Record<string, string> = { page: String(pageNum) };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (directionFilter !== "all") params.direction = directionFilter;

      const data = await callLogsList(params as any);
      const results = (data as any).results || (data as any) || [];
      const next = (data as any).next;
      const count = (data as any).count || results.length;

      if (append) {
        setCallLogs(prev => [...prev, ...results]);
      } else {
        setCallLogs(results);
      }
      setHasMore(!!next);
      setTotalCount(count);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch call logs:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, directionFilter]);

  useEffect(() => {
    fetchCallLogs(1);
  }, [callEndedCounter, search, statusFilter, directionFilter, fetchCallLogs]);

  const handleClickToCall = (phoneNumber: string) => {
    setDialNumber(phoneNumber);
    setIsDialpadOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      answered: { variant: "default", label: t("logs.answered") },
      ended: { variant: "secondary", label: t("logs.ended") },
      missed: { variant: "destructive", label: t("logs.missed") },
      failed: { variant: "destructive", label: t("logs.failed") },
      busy: { variant: "outline", label: t("logs.busy") },
      no_answer: { variant: "outline", label: t("logs.noAnswer") },
      cancelled: { variant: "outline", label: t("logs.cancelled") },
      initiated: { variant: "secondary", label: t("logs.initiated") },
      ringing: { variant: "secondary", label: t("logs.ringing") },
    };

    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCallIcon = (direction: string, status: string) => {
    if (status === "missed" || status === "no_answer") {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    return direction === "inbound" ? (
      <PhoneIncoming className="h-4 w-4 text-green-600" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
    );
  };

  const getPhoneNumber = (log: CallLog) => {
    return log.direction === "inbound" ? log.caller_number : log.recipient_number;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("logs.title")}</h2>
        <Button onClick={() => fetchCallLogs(1)} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("logs.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("logs.allStatuses")}</SelectItem>
            <SelectItem value="answered">{t("logs.answered")}</SelectItem>
            <SelectItem value="missed">{t("logs.missed")}</SelectItem>
            <SelectItem value="failed">{t("logs.failed")}</SelectItem>
            <SelectItem value="ended">{t("logs.ended")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("logs.allDirections")}</SelectItem>
            <SelectItem value="inbound">{t("incoming")}</SelectItem>
            <SelectItem value="outbound">{t("outgoing")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t("logs.loading")}</p>
          </CardContent>
        </Card>
      ) : callLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t("logs.noCallsFound")}</h3>
            <p className="text-muted-foreground">{t("logs.noCallsDescription")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {callLogs.map((log) => {
            const phoneNumber = getPhoneNumber(log);
            return (
              <Card key={log.id} className="hover:bg-accent/50 transition-colors">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getCallIcon(log.direction, log.status)}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {log.client_name || phoneNumber}
                        </CardTitle>
                        {log.client_name && (
                          <CardDescription className="text-xs">
                            {phoneNumber}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleClickToCall(phoneNumber)}
                        title={t("logs.callBack")}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.started_at), "MMM d, h:mm a")}
                    </span>
                    {log.duration_display && (
                      <span>{t("duration")}: {log.duration_display}</span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {log.direction === "inbound" ? t("incoming") : t("outgoing")}
                    </Badge>
                    {log.handled_by_name && (
                      <span>{log.handled_by_name}</span>
                    )}
                    {log.call_quality_score != null && (
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${star <= log.call_quality_score! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchCallLogs(page + 1, true)}
            >
              {t("logs.loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
