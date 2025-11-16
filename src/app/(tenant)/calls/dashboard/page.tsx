"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { DialPad } from "@/components/calls/DialPad";
import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SipService } from "@/services/SipService";
import { AlertCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Invitation } from "sip.js";
import {
  sipConfigurationsList,
  sipConfigurationsWebrtcConfigRetrieve,
  callLogsInitiateCallCreate,
  callLogsLogIncomingCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
} from "@/api/generated/api";
import type { SipConfigurationDetail } from "@/api/generated/interfaces";

type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ending";

interface ActiveCall {
  id: string;
  logId: number;
  number: string;
  direction: "incoming" | "outgoing";
  status: CallStatus;
  startTime?: Date;
  duration: number;
  invitation?: Invitation;
  isOnHold?: boolean;
  isMuted?: boolean;
}

export default function CallsDashboardPage() {
  const router = useRouter();
  const [dialNumber, setDialNumber] = useState("");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [sipRegistered, setSipRegistered] = useState(false);
  const [sipConnecting, setSipConnecting] = useState(false);
  const [activeSipConfig, setActiveSipConfig] =
    useState<SipConfigurationDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Refs
  const sipServiceRef = useRef<SipService | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRingtonePlayingRef = useRef<boolean>(false);

  // Ringtone functions
  const createRingtone = async () => {
    if (!isRingtonePlayingRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        audioContext.currentTime + 0.1
      );
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      if (isRingtonePlayingRef.current) {
        ringtoneTimeoutRef.current = setTimeout(createRingtone, 1000);
      }
    } catch (error) {
      console.warn("Could not create ringtone:", error);
    }
  };

  const playRingtone = () => {
    if (isRingtonePlayingRef.current) return;
    isRingtonePlayingRef.current = true;
    createRingtone();
  };

  const stopRingtone = () => {
    isRingtonePlayingRef.current = false;

    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }
  };

  // Initialize SIP
  const initializeSipService = async (config: SipConfigurationDetail) => {
    try {
      if (!localAudioRef.current || !remoteAudioRef.current) {
        throw new Error("Audio elements not ready");
      }

      setSipConnecting(true);

      const sipService = new SipService(
        localAudioRef.current,
        remoteAudioRef.current
      );

      sipService.on("onRegistered", () => {
        setSipRegistered(true);
        setSipConnecting(false);
        setError("");
      });

      sipService.on("onUnregistered", () => {
        setSipRegistered(false);
        setSipConnecting(false);
      });

      sipService.on("onRegistrationFailed", (error) => {
        console.error("❌ SIP registration failed:", error);
        setSipRegistered(false);
        setSipConnecting(false);
        setError(`SIP registration failed: ${error || "Unknown error"}`);
      });

      sipService.on("onIncomingCall", async (invitation: Invitation) => {
        playRingtone();

        const phoneNumber =
          invitation.remoteIdentity.uri.user || "Unknown Number";

        try {
          const logResponse = await callLogsLogIncomingCallCreate({
            caller_number: phoneNumber,
            recipient_number: activeSipConfig?.username || "",
            direction: "inbound" as any,
          });

          setActiveCall({
            id: invitation.id,
            logId: logResponse.id,
            number: phoneNumber,
            direction: "incoming",
            status: "ringing",
            duration: 0,
            invitation,
          });
        } catch (error) {
          console.error("Failed to log incoming call:", error);
        }
      });

      sipService.on("onCallAccepted", async () => {
        stopRingtone();

        if (activeCall) {
          setActiveCall({
            ...activeCall,
            status: "active",
            startTime: new Date(),
          });

          try {
            await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
              status: "answered" as any,
            });
          } catch (error) {
            console.error("Failed to update call status:", error);
          }
        }
      });

      sipService.on("onCallEnded", async () => {
        stopRingtone();

        if (activeCall) {
          try {
            await callLogsEndCallCreate(activeCall.logId, {
              status: "ended" as any,
            });
          } catch (error) {
            console.error("Failed to end call log:", error);
          }
        }

        setActiveCall(null);
        setCallDuration(0);
      });

      sipService.on("onCallFailed", async (error) => {
        console.error("❌ Call failed:", error);
        stopRingtone();

        if (activeCall) {
          try {
            await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
              status: "failed" as any,
            });
          } catch (err) {
            console.error("Failed to update call status:", err);
          }
        }

        setActiveCall(null);
        setCallDuration(0);
        setError(`Call failed: ${error || "Unknown error"}`);
      });

      await sipService.initialize(config);

      sipServiceRef.current = sipService;
    } catch (error: any) {
      console.error("Failed to initialize SIP service:", error);
      setSipConnecting(false);
      setError(`Failed to initialize SIP: ${error.message || "Unknown error"}`);
    }
  };

  // Load SIP configuration
  const loadSipConfiguration = async () => {
    try {
      setLoading(true);
      const response = await sipConfigurationsList();

      const defaultConfig = response.results.find((config) => config.is_default);
      if (!defaultConfig) {
        setError("No default SIP configuration found. Please configure SIP settings.");
        setLoading(false);
        return;
      }

      const webrtcConfig = await sipConfigurationsWebrtcConfigRetrieve(
        defaultConfig.id
      );
      setActiveSipConfig(webrtcConfig);
    } catch (error: any) {
      console.error("Failed to load SIP configuration:", error);
      setError("Failed to load SIP configuration");
    } finally {
      setLoading(false);
    }
  };

  // Make outbound call
  const makeCall = async () => {
    if (!dialNumber || !sipServiceRef.current) return;

    try {
      const logResponse = await callLogsInitiateCallCreate({
        recipient_number: dialNumber,
      });

      setActiveCall({
        id: logResponse.call_id,
        logId: logResponse.id,
        number: dialNumber,
        direction: "outgoing",
        status: "connecting",
        duration: 0,
      });

      await sipServiceRef.current.makeCall(dialNumber);

      setActiveCall((prev) =>
        prev ? { ...prev, status: "ringing" } : null
      );

      setDialNumber("");
    } catch (error: any) {
      console.error("Failed to make call:", error);
      setError(`Failed to make call: ${error.message || "Unknown error"}`);
      setActiveCall(null);
    }
  };

  // Call control functions
  const handleAcceptCall = async () => {
    if (sipServiceRef.current) {
      try {
        await sipServiceRef.current.acceptCall();
        stopRingtone();
      } catch (error: any) {
        console.error("Failed to accept call:", error);
        setError(`Failed to accept call: ${error.message}`);
      }
    }
  };

  const handleRejectCall = async () => {
    if (sipServiceRef.current && activeCall) {
      try {
        await sipServiceRef.current.rejectCall();
        stopRingtone();
        setActiveCall(null);

        await callLogsUpdateStatusPartialUpdate(activeCall.logId, {
          status: "cancelled" as any,
        });
      } catch (error: any) {
        console.error("Failed to reject call:", error);
      }
    }
  };

  const handleEndCall = async () => {
    if (sipServiceRef.current) {
      try {
        await sipServiceRef.current.endCall();
        stopRingtone();
      } catch (error: any) {
        console.error("Failed to end call:", error);
      }
    }
  };

  const handleToggleHold = () => {
    // TODO: Implement hold functionality
  };

  const handleToggleMute = () => {
    // TODO: Implement mute functionality
  };

  // Effects
  useEffect(() => {
    loadSipConfiguration();

    return () => {
      if (sipServiceRef.current) {
        sipServiceRef.current.disconnect();
      }
      stopRingtone();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      activeSipConfig &&
      localAudioRef.current &&
      remoteAudioRef.current &&
      !sipServiceRef.current
    ) {
      initializeSipService(activeSipConfig);
    }
  }, [activeSipConfig]);

  useEffect(() => {
    if (activeCall?.status === "active" && activeCall.startTime) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(
          Math.floor((Date.now() - activeCall.startTime!.getTime()) / 1000)
        );
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall?.status, activeCall?.startTime]);

  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your SIP calls and view real-time call status
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/calls/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            SIP Settings
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading SIP configuration...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* SIP Status */}
              <SipStatusIndicator
                isRegistered={sipRegistered}
                isConnecting={sipConnecting}
                sipServer={activeSipConfig?.sip_server}
                extension={activeSipConfig?.username}
              />

              {/* Active Call or Dial Pad */}
              {activeCall ? (
                <ActiveCallDisplay
                  phoneNumber={activeCall.number}
                  direction={activeCall.direction}
                  status={activeCall.status as "ringing" | "connecting" | "active" | "ending"}
                  duration={callDuration}
                  isOnHold={activeCall.isOnHold}
                  isMuted={activeCall.isMuted}
                  onEndCall={handleEndCall}
                  onToggleHold={handleToggleHold}
                  onToggleMute={handleToggleMute}
                  onAccept={
                    activeCall.direction === "incoming"
                      ? handleAcceptCall
                      : undefined
                  }
                  onReject={
                    activeCall.direction === "incoming"
                      ? handleRejectCall
                      : undefined
                  }
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

            {/* Right Column - Quick Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push("/calls/logs")}
                  >
                    View Call History
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push("/calls/settings")}
                  >
                    Configure SIP Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Hidden audio elements */}
        <audio ref={localAudioRef} autoPlay muted />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </FeatureGate>
  );
}
