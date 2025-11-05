"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  isOnHold?: boolean;
  isMuted?: boolean;
  onEndCall: () => void;
  onToggleHold?: () => void;
  onToggleMute?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export function ActiveCallDisplay({
  phoneNumber,
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
}: ActiveCallDisplayProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    const variants = {
      ringing: { label: "Ringing", variant: "default" as const },
      connecting: { label: "Connecting", variant: "secondary" as const },
      active: { label: "Active", variant: "default" as const },
      ending: { label: "Ending", variant: "destructive" as const },
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
            {direction === "incoming" ? "Incoming Call" : "Outgoing Call"}
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
            <p className="text-2xl font-semibold">{phoneNumber}</p>
            {status === "active" && (
              <p className="text-lg text-muted-foreground mt-2">
                {formatDuration(duration)}
              </p>
            )}
            {isOnHold && (
              <Badge variant="secondary" className="mt-2">
                On Hold
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
            <Button variant="outline" size="lg" disabled>
              <Volume2 className="h-5 w-5" />
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
        )}
      </CardContent>
    </Card>
  );
}
