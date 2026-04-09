"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { callLogsList } from "@/api/generated/api";

interface CallLog {
  id: number;
  call_type: "inbound" | "outbound";
  phone_number: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  client_name: string | null;
}

export function CallHistory() {
  const t = useTranslations("calls");
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCallLogs = async () => {
    try {
      setLoading(true);
      const data = await callLogsList();
      setCallLogs((data as any).results || (data as any) || []);
    } catch (error) {
      console.error("Failed to fetch call logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      answered: { variant: "default", label: t("logs.answered") },
      missed: { variant: "destructive", label: t("logs.missed") },
      ended: { variant: "secondary", label: t("logs.ended") },
      failed: { variant: "destructive", label: t("logs.failed") },
      busy: { variant: "outline", label: t("logs.busy") },
      no_answer: { variant: "outline", label: t("logs.noAnswer") },
    };

    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCallIcon = (callType: string, status: string) => {
    if (status === "missed") {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    return callType === "inbound" ? (
      <PhoneIncoming className="h-4 w-4 text-green-600" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t("logs.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (callLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t("logs.noCallsFound")}</h3>
          <p className="text-muted-foreground">{t("logs.noCallsDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("logs.title")}</h2>
        <Button onClick={fetchCallLogs} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {callLogs.map((log) => (
        <Card key={log.id}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getCallIcon(log.call_type, log.status)}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {log.client_name || log.phone_number}
                  </CardTitle>
                  {log.client_name && (
                    <CardDescription className="text-xs">
                      {log.phone_number}
                    </CardDescription>
                  )}
                </div>
              </div>
              {getStatusBadge(log.status)}
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(log.started_at), "MMM d, h:mm a")}
              </span>
              {log.duration !== null && (
                <span>{t("duration")}: {formatDuration(log.duration)}</span>
              )}
              <Badge variant="outline" className="text-xs">
                {log.call_type === "inbound" ? t("incoming") : t("outgoing")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
