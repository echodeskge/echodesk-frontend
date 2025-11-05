"use client";

import { useEffect, useState } from "react";
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
      answered: { variant: "default" as const, label: "Answered" },
      missed: { variant: "destructive" as const, label: "Missed" },
      ended: { variant: "secondary" as const, label: "Ended" },
      failed: { variant: "destructive" as const, label: "Failed" },
      busy: { variant: "outline" as const, label: "Busy" },
      no_answer: { variant: "outline" as const, label: "No Answer" },
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
    <FeatureGate feature="sip_calling" showUpgrade={true}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call Logs</h1>
            <p className="text-muted-foreground">
              View and manage your call history
            </p>
          </div>
          <Button onClick={fetchCallLogs} variant="outline">
            Refresh
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading call logs...</p>
            </CardContent>
          </Card>
        ) : callLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No call logs yet</h3>
              <p className="text-muted-foreground">
                Your call history will appear here once you make or receive calls
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
                          Duration: {formatDuration(log.duration)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {log.call_type === "inbound" ? "Incoming" : "Outgoing"}
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
