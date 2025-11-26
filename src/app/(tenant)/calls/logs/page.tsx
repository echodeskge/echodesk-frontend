"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User } from "lucide-react";
import { format } from "date-fns";

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

export default function CallLogsPage() {
  const t = useTranslations("calls");
  const tCommon = useTranslations("common");
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallLogs();
  }, []);

  const fetchCallLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const tenantSubdomain = window.location.hostname.split(".")[0];

      const response = await fetch(
        `https://${tenantSubdomain}.api.echodesk.ge/api/call-logs/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCallLogs(data.results || data);
      }
    } catch (error) {
      console.error("Failed to fetch call logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      answered: { variant: "default" as const, label: t("logs.answered") },
      missed: { variant: "destructive" as const, label: t("logs.missed") },
      ended: { variant: "secondary" as const, label: t("logs.ended") },
      failed: { variant: "destructive" as const, label: t("logs.failed") },
      busy: { variant: "outline" as const, label: t("logs.busy") },
      no_answer: { variant: "outline" as const, label: t("logs.noAnswer") },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

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

  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("logs.title")}</h1>
            <p className="text-muted-foreground">
              {t("logs.subtitle")}
            </p>
          </div>
          <Button onClick={fetchCallLogs} variant="outline">
            {t("refresh")}
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{tCommon("loading")}</p>
            </CardContent>
          </Card>
        ) : callLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t("logs.noCallsFound")}</h3>
              <p className="text-muted-foreground">
                {t("logs.noCallsDescription")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {callLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getCallIcon(log.call_type, log.status)}
                      <div>
                        <CardTitle className="text-base">
                          {log.client_name || log.phone_number}
                        </CardTitle>
                        {log.client_name && (
                          <CardDescription className="text-sm">
                            {log.phone_number}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(log.started_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {log.duration !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {t("duration")}: {formatDuration(log.duration)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {log.call_type === "inbound" ? t("incoming") : t("outgoing")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
