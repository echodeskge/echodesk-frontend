"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  PhoneForwarded,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ActiveCallDisplayProps {
  phoneNumber: string;
  direction: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "active" | "ending";
  duration: number;
  callerName?: string;
  isOnHold?: boolean;
  isMuted?: boolean;
  onEndCall: () => void;
  onToggleHold?: () => void;
  onToggleMute?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onTransfer?: (targetNumber: string) => void;
}

export function ActiveCallDisplay({
  phoneNumber,
  callerName,
  direction,
  status,
  duration,
  isOnHold,
  isMuted,
  onEndCall,
  onToggleHold,
  onToggleMute,
  onAccept,
  onReject,
  onTransfer,
}: ActiveCallDisplayProps) {
  const t = useTranslations("calls");
  const { user } = useAuth();
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferMode, setTransferMode] = useState<"agent" | "external">("agent");
  const [agents, setAgents] = useState<Array<{ id: number; userId: number; name: string; extension: string; phone: string; online: boolean }>>([]);

  useEffect(() => {
    if (showTransfer && agents.length === 0) {
      // Fetch assignments and online status in parallel
      Promise.all([
        axios.get("/api/phone-assignments/?is_active=true"),
        axios.get("/api/extensions/status/").catch(() => ({ data: { extensions: [] } })),
      ]).then(([assignRes, statusRes]) => {
        const data = assignRes.data.results || assignRes.data || [];
        const onlineExts = new Set(
          (statusRes.data.extensions || [])
            .filter((e: any) => e.status === "online")
            .map((e: any) => e.extension)
        );

        const filtered = data.filter((a: any) => a.user !== user?.id);
        setAgents(filtered.map((a: any) => ({
          id: a.id,
          userId: a.user,
          name: a.user_name || `Ext ${a.extension}`,
          extension: a.extension,
          phone: a.phone_number,
          online: onlineExts.has(a.extension),
        })));
      }).catch(() => {});
    }
  }, [showTransfer, user?.id]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    const variants = {
      ringing: { label: t("dashboard.ringing"), variant: "default" as const },
      connecting: { label: t("dashboard.connecting"), variant: "secondary" as const },
      active: { label: t("dashboard.active"), variant: "default" as const },
      ending: { label: t("dashboard.ending"), variant: "destructive" as const },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInitials = (phone: string) => {
    // Try to extract last 4 digits for display
    const digits = phone.replace(/\D/g, "");
    return digits.slice(-4) || "?";
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {direction === "incoming" ? t("incomingCall") : t("outgoingCall")}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Caller Info */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl">
              <Phone className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            {callerName && <p className="text-lg font-semibold">{callerName}</p>}
            <p className={callerName ? "text-sm text-muted-foreground" : "text-2xl font-semibold"}>{phoneNumber}</p>
            {status === "active" && (
              <p className="text-lg text-muted-foreground mt-2">
                {formatDuration(duration)}
              </p>
            )}
            {isOnHold && (
              <Badge variant="secondary" className="mt-2">
                {t("onHold")}
              </Badge>
            )}
          </div>
        </div>

        {/* Call Controls */}
        {status === "ringing" && direction === "incoming" ? (
          // Incoming call - show accept/reject
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          // Active call controls
          <>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant={isMuted ? "default" : "outline"}
              size="lg"
              onClick={onToggleMute}
              disabled={status !== "active"}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant={isOnHold ? "default" : "outline"}
              size="lg"
              onClick={onToggleHold}
              disabled={status !== "active"}
            >
              {isOnHold ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant={showTransfer ? "default" : "outline"}
              size="lg"
              onClick={() => setShowTransfer(!showTransfer)}
              disabled={status !== "active" || !onTransfer}
            >
              <PhoneForwarded className="h-5 w-5" />
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={onEndCall}
              disabled={status === "ending"}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>

          {/* Transfer panel */}
          {showTransfer && onTransfer && (
            <div className="mt-3 space-y-2">
              {transferMode === "agent" ? (
                <div className="space-y-2">
                  {agents.length > 0 ? (
                    <div className="space-y-1">
                      {agents.map((agent) => (
                        <Button
                          key={agent.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs"
                          disabled={!agent.online}
                          onClick={() => {
                            onTransfer(agent.extension);
                            setShowTransfer(false);
                          }}
                        >
                          <span className={`h-2 w-2 rounded-full mr-2 flex-shrink-0 ${agent.online ? "bg-green-500" : "bg-gray-300"}`} />
                          {agent.name} (ext {agent.extension})
                          {!agent.online && <span className="ml-auto text-muted-foreground">{t("dashboard.offline")}</span>}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("dashboard.noAgents")}</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setTransferMode("external")}
                  >
                    {t("dashboard.transferToNumber")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder={t("dashboard.transferTo")}
                      value={transferNumber}
                      onChange={(e) => setTransferNumber(e.target.value)}
                      className="text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && transferNumber) {
                          onTransfer(transferNumber);
                          setShowTransfer(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (transferNumber) {
                          onTransfer(transferNumber);
                          setShowTransfer(false);
                        }
                      }}
                      disabled={!transferNumber}
                    >
                      <PhoneForwarded className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setTransferMode("agent")}
                  >
                    {t("dashboard.transferToAgent")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
        )}
      </CardContent>
    </Card>
  );
}
