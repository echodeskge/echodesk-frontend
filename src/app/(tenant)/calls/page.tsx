"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { DialPad } from "@/components/calls/DialPad";
import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";
import { CallHistory } from "@/components/calls/CallHistory";
import { useCall } from "@/contexts/CallContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Settings } from "lucide-react";

export default function CallsPage() {
  const t = useTranslations("calls");
  const router = useRouter();
  const {
    activeCall,
    callDuration,
    sipRegistered,
    sipConnecting,
    activeSipConfig,
    dialNumber,
    setDialNumber,
    makeCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    handleToggleHold,
    handleToggleMute,
    error,
    loading,
  } = useCall();

  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/settings/calls")}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t("settings.title")}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Two-column layout: dialpad left, history right */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Dialpad area — fixed width */}
          <div className="w-full md:w-[340px] md:min-w-[340px] md:max-w-[340px] space-y-4 flex-shrink-0">
            <SipStatusIndicator
              isRegistered={sipRegistered}
              isConnecting={sipConnecting}
              sipServer={activeSipConfig?.sip_server}
              extension={activeSipConfig?.username}
            />

            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">{t("dashboard.loadingConfig")}</p>
                </CardContent>
              </Card>
            ) : !activeSipConfig ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <p className="text-muted-foreground">{t("dashboard.noConfig")}</p>
                  <Button onClick={() => router.push("/settings/calls")}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t("dashboard.configureSip")}
                  </Button>
                </CardContent>
              </Card>
            ) : activeCall ? (
              <ActiveCallDisplay
                phoneNumber={activeCall.number}
                direction={activeCall.direction}
                status={activeCall.status as "ringing" | "connecting" | "active" | "ending"}
                duration={callDuration}
                isOnHold={activeCall.isOnHold}
                isMuted={activeCall.isMuted}
                onAccept={handleAcceptCall}
                onReject={handleRejectCall}
                onEndCall={handleEndCall}
                onToggleHold={handleToggleHold}
                onToggleMute={handleToggleMute}
              />
            ) : (
              <DialPad
                value={dialNumber}
                onChange={setDialNumber}
                onCall={makeCall}
                disabled={!sipRegistered}
              />
            )}
          </div>

          {/* Right: Call History — fills remaining space */}
          <div className="flex-1 min-w-0">
            <CallHistory />
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
