"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Grid3x3,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Play,
  UserPlus,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveCall, CallDirection, CallStatus } from "@/contexts/call-types";
import { useCallDuration } from "@/hooks/useCallDuration";
import { callInitials, formatMmSs } from "../call-format";
import { ConsultationBar } from "./consultation-bar";
import { DtmfKeypad } from "./dtmf-keypad";
import { SpeakerPicker, isSinkSelectionSupported } from "./speaker-picker";
import { TransferPanel } from "./transfer-panel";
import { useCallActions } from "./use-rail-call";

export type BadgeTone = "ringing" | "held" | "active" | "ending";

/** Status badge tone + label key for the in-call header. */
export function callBadge(
  direction: CallDirection,
  status: CallStatus,
  isOnHold?: boolean
): { key: "badgeIncoming" | "badgeCalling" | "badgeOnHold" | "badgeConnected" | "badgeEnding"; tone: BadgeTone } {
  if (status === "ending") return { key: "badgeEnding", tone: "ending" };
  if (status === "ringing" || status === "connecting") {
    return { key: direction === "incoming" ? "badgeIncoming" : "badgeCalling", tone: "ringing" };
  }
  if (isOnHold) return { key: "badgeOnHold", tone: "held" };
  return { key: "badgeConnected", tone: "active" };
}

export const BADGE_TONE: Record<BadgeTone, string> = {
  ringing: "bg-primary/[.08] text-foreground",
  held: "bg-[#fd7e1420] text-[#c2410c] dark:text-orange-400",
  active: "bg-ed-green/12 text-ed-green",
  ending: "bg-destructive/10 text-destructive",
};

function ControlButton({
  icon,
  label,
  pressed,
  disabled,
  title,
  onClick,
  testId,
}: {
  icon: ReactNode;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
      data-testid={testId}
      className={cn(
        "flex h-[60px] flex-col items-center justify-center gap-1 rounded-[10px] border text-[11px] font-medium transition hover:brightness-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
        pressed ? "border-primary bg-primary text-primary-foreground" : "bg-background"
      )}
    >
      {icon}
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}

type Panel = "none" | "keypad" | "transfer" | "speaker";

/**
 * The softphone while a call exists (spec A2): direction line + status
 * badge, 84px avatar with the ringing halo, name / number / timer, Accept /
 * Decline for an incoming ring, otherwise the six controls, the open panel
 * (DTMF, transfer, speaker), the consultation bar and End.
 */
export function InCallView({ call }: { call: ActiveCall }) {
  const t = useTranslations("calls.rail");
  const actions = useCallActions();
  const duration = useCallDuration(call.status === "active" ? call.startTime : null);
  const [panel, setPanel] = useState<Panel>("none");
  const sinkSupported = isSinkSelectionSupported();

  const isActive = call.status === "active";
  const isRinging = call.status === "ringing" || call.status === "connecting";
  const isIncomingRinging = isRinging && call.direction === "incoming";

  // Leaving the active state (or entering a consultation) closes the panels.
  useEffect(() => {
    if (!isActive) setPanel("none");
  }, [isActive]);
  useEffect(() => {
    if (call.transferPhase !== "idle") setPanel((p) => (p === "transfer" ? "none" : p));
  }, [call.transferPhase]);

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  const badge = callBadge(call.direction, call.status, call.isOnHold);
  const displayName = call.callerName || call.number;
  const ringColor: CSSProperties = { ["--ring-c" as string]: call.direction === "incoming" ? "var(--green)" : "var(--foreground)" };

  return (
    <div className="flex flex-1 flex-col p-5" data-testid="call-rail-in-call" data-call-status={call.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {call.direction === "incoming" ? (
            <PhoneIncoming className="h-[13px] w-[13px] shrink-0" />
          ) : (
            <PhoneOutgoing className="h-[13px] w-[13px] shrink-0" />
          )}
          <span className="truncate">{call.direction === "incoming" ? t("incomingCall") : t("outgoingCall")}</span>
        </span>
        <span
          className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold", BADGE_TONE[badge.tone])}
          aria-live="polite"
          data-testid="call-rail-status"
          data-status={call.status}
          data-hold={call.isOnHold ? "true" : undefined}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", badge.tone === "ringing" && "motion-safe:animate-ed-blink-slow")} aria-hidden />
          {t(badge.key)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3.5 pb-7 pt-9 text-center">
        <span
          className={cn(
            "flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary/[.08] text-[26px] font-semibold text-primary",
            isRinging && "motion-safe:animate-ed-ring"
          )}
          style={isRinging ? ringColor : undefined}
          aria-hidden
          data-testid="call-rail-avatar"
        >
          {callInitials(call.callerName || call.number)}
        </span>
        <div className="min-w-0 max-w-full">
          <p className="truncate text-lg font-semibold leading-6">{displayName}</p>
          <p className="truncate text-[13px] text-muted-foreground tabular-nums">{call.callerName ? call.number : t("unknownCaller")}</p>
        </div>
        <p
          className={cn("font-mono text-[22px] leading-7 tabular-nums", isActive ? "text-foreground" : "text-muted-foreground")}
          data-testid="call-rail-timer"
        >
          {isRinging ? (call.direction === "incoming" ? t("ringing") : t("calling")) : formatMmSs(duration)}
        </p>
      </div>

      {isIncomingRinging ? (
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              void actions.rejectCall();
            }}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-destructive text-xs font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="call-rail-decline"
          >
            <PhoneOff className="h-5 w-5" />
            {t("decline")}
          </button>
          <button
            type="button"
            onClick={() => {
              void actions.acceptCall();
            }}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-ed-green text-xs font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="call-rail-accept"
          >
            <Phone className="h-5 w-5" />
            {t("accept")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <ControlButton
              icon={call.isMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              label={call.isMuted ? t("unmute") : t("mute")}
              pressed={call.isMuted}
              disabled={!isActive}
              onClick={actions.toggleMute}
              testId="call-rail-mute"
            />
            <ControlButton
              icon={call.isOnHold ? <Play className="h-[18px] w-[18px]" /> : <Pause className="h-[18px] w-[18px]" />}
              label={call.isOnHold ? t("resume") : t("hold")}
              pressed={call.isOnHold}
              disabled={!isActive}
              onClick={() => {
                void actions.toggleHold();
              }}
              testId="call-rail-hold"
            />
            <ControlButton
              icon={<Grid3x3 className="h-[18px] w-[18px]" />}
              label={t("keypad")}
              pressed={panel === "keypad"}
              disabled={!isActive}
              onClick={() => toggle("keypad")}
              testId="call-rail-keypad"
            />
            <ControlButton
              icon={<PhoneForwarded className="h-[18px] w-[18px]" />}
              label={t("transfer")}
              pressed={panel === "transfer"}
              disabled={!isActive || call.transferPhase !== "idle"}
              onClick={() => toggle("transfer")}
              testId="call-rail-transfer"
            />
            <ControlButton
              icon={<UserPlus className="h-[18px] w-[18px]" />}
              label={t("addCall")}
              disabled
              title={t("comingSoon")}
              testId="call-rail-add"
            />
            <ControlButton
              icon={<Volume2 className="h-[18px] w-[18px]" />}
              label={t("speaker")}
              pressed={panel === "speaker"}
              disabled={!isActive || !sinkSupported}
              title={sinkSupported ? undefined : t("speakerUnavailable")}
              onClick={() => toggle("speaker")}
              testId="call-rail-speaker"
            />
          </div>

          {panel === "keypad" && isActive && <DtmfKeypad onSend={actions.sendDTMF} />}

          {panel === "transfer" && isActive && call.transferPhase === "idle" && (
            <TransferPanel onDone={() => setPanel("none")} />
          )}

          {panel === "speaker" && isActive && sinkSupported && <SpeakerPicker />}

          {call.transferPhase === "consulting" && call.consultationCall && (
            <ConsultationBar call={call} consultation={call.consultationCall} />
          )}

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => {
                void actions.endCall();
              }}
              disabled={call.status === "ending"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              data-testid="call-rail-end"
            >
              <PhoneOff className="h-4 w-4" />
              {isRinging ? t("cancel") : t("endCall")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
