"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface SipStatusIndicatorProps {
  isRegistered: boolean;
  isConnecting?: boolean;
  sipServer?: string;
  extension?: string;
}

export function SipStatusIndicator({
  isRegistered,
  isConnecting,
  sipServer,
  extension,
}: SipStatusIndicatorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : isRegistered ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-semibold text-sm">SIP Status</p>
              {sipServer && (
                <p className="text-xs text-muted-foreground">{sipServer}</p>
              )}
            </div>
          </div>
          <Badge
            variant={
              isConnecting
                ? "secondary"
                : isRegistered
                ? "default"
                : "destructive"
            }
          >
            {isConnecting
              ? "Connecting"
              : isRegistered
              ? `Registered${extension ? ` (${extension})` : ""}`
              : "Disconnected"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
