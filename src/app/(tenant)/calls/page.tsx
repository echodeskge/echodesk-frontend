"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { DialPad } from "@/components/calls/DialPad";
import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";
import { CallHistory } from "@/components/calls/CallHistory";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Settings } from "lucide-react";

export default function CallsPage() {
  const t = useTranslations("calls");
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.is_staff || user?.is_superuser;
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
    sendDTMF,
    transferCall,
    startAttendedTransfer,
    completeTransfer,
    cancelTransfer,
    mergeConference,
    error,
    loading,
  } = useCall();

  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/settings/calls")}
            >
              <Settings className="h-4 w-4 mr-1" />
              {t("settings.title")}
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Two-column layout: dialpad left, history right — fills remaining height */}
        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
          {/* Left: Dialpad area — fixed width, self-aligned to top */}
          <div className="w-full md:w-[340px] md:min-w-[340px] md:max-w-[340px] space-y-4 flex-shrink-0">
            {isAdmin && (
              <SipStatusIndicator
                isRegistered={sipRegistered}
                isConnecting={sipConnecting}
                sipServer={activeSipConfig?.sip_server}
                extension={activeSipConfig?.username}
              />
            )}

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
                  {isAdmin && (
                    <Button onClick={() => router.push("/settings/calls")}>
                      <Settings className="h-4 w-4 mr-2" />
                      {t("dashboard.configureSip")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : activeCall ? (
              <>
              <ActiveCallDisplay
                phoneNumber={activeCall.number}
                callerName={activeCall.callerName}
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
                onTransfer={async (num) => { try { await transferCall(num); } catch {} }}
                transferPhase={activeCall.transferPhase}
                consultationCall={activeCall.consultationCall}
                onStartAttendedTransfer={async (num, name) => { try { await startAttendedTransfer(num, name); } catch {} }}
                onCompleteTransfer={async () => { try { await completeTransfer(); } catch {} }}
                onCancelTransfer={async () => { try { await cancelTransfer(); } catch {} }}
                onMergeConference={async () => { try { await mergeConference(); } catch {} }}
              />
              {activeCall.status === "active" && (
                <DialPad
                  value={dialNumber}
                  onChange={setDialNumber}
                  onCall={() => {}}
                  disabled={false}
                  dtmfMode
                  onDTMF={sendDTMF}
                />
              )}
            </>
            ) : (
              <DialPad
                value={dialNumber}
                onChange={setDialNumber}
                onCall={makeCall}
                disabled={!sipRegistered}
                // Mirror the popup: the decline button is shown but stays
                // disabled in idle state (a ringing call swaps this branch
                // for ActiveCallDisplay above).
                onDecline={handleEndCall}
                declineDisabled
              />
            )}
          </div>

          {/* Right: Call History — scrollable, fills remaining space */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <CallHistory />
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
