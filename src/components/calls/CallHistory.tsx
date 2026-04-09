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
  client_name: string | null;
  sip_config_name: string | null;
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
                {getCallIcon(log.direction, log.status)}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {log.client_name || getPhoneNumber(log)}
                  </CardTitle>
                  {log.client_name && (
                    <CardDescription className="text-xs">
                      {getPhoneNumber(log)}
                    </CardDescription>
                  )}
                </div>
              </div>
              {getStatusBadge(log.status)}
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
