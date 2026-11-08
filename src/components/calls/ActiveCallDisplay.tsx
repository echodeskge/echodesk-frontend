"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
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
  Users,
  X,
} from "lucide-react";
import axios from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { TransferPhase, ConsultationCall } from "@/contexts/CallContext";
import { DIAL_KEYS } from "./DialPad";
import { callInitials, formatMmSs } from "./call-format";

interface ActiveCallDisplayProps {
  phoneNumber: string;
  direction: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "active" | "ending";
  duration: number;
  callerName?: string;
  isOnHold?: boolean;
  isMuted?: boolean;
  transferPhase?: TransferPhase;
  consultationCall?: ConsultationCall | null;
  onEndCall: () => void;
  onToggleHold?: () => void;
  onToggleMute?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onTransfer?: (targetNumber: string) => void;
  onStartAttendedTransfer?: (targetNumber: string, targetName?: string) => void;
  onCompleteTransfer?: () => void;
  onCancelTransfer?: () => void;
  onMergeConference?: () => void;
  /** Sends one DTMF tone; enables the in-call Keypad control. */
  onSendDTMF?: (tone: string) => unknown;
  /** Opens the caller details sheet (client, tickets, history, notes). */
  onShowDetails?: () => void;
}

interface TransferAgent {
  id: number;
  userId: number;
  name: string;
  extension: string;
  phone: string;
  online: boolean;
}

/** Status badge tone + label key for the in-call header. */
export function callBadge(
  direction: "incoming" | "outgoing",
  status: ActiveCallDisplayProps["status"],
  isOnHold?: boolean
): { key: "badgeIncoming" | "badgeCalling" | "badgeOnHold" | "badgeConnected" | "badgeEnding"; tone: "ringing" | "held" | "active" | "ending" } {
  if (status === "ending") return { key: "badgeEnding", tone: "ending" };
  if (status === "ringing" || status === "connecting") {
    return { key: direction === "incoming" ? "badgeIncoming" : "badgeCalling", tone: "ringing" };
  }
  if (isOnHold) return { key: "badgeOnHold", tone: "held" };
  return { key: "badgeConnected", tone: "active" };
}

const BADGE_TONE: Record<"ringing" | "held" | "active" | "ending", string> = {
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
  onClick,
  testId,
}: {
  icon: ReactNode;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
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

/**
 * The softphone while a call exists: direction + status badge, caller
 * identity with a ringing halo, timer, Accept / Decline for an incoming
 * call, otherwise Mute / Hold / Keypad / Transfer, the attended-transfer
 * (consultation) controls and End. Presentational: every action comes from
 * CallContext through props.
 */
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
  transferPhase = "idle",
  consultationCall,
  onStartAttendedTransfer,
  onCompleteTransfer,
  onCancelTransfer,
  onMergeConference,
  onSendDTMF,
  onShowDetails,
}: ActiveCallDisplayProps) {
  const t = useTranslations("calls.phone");
  const { user } = useAuth();
  const [panel, setPanel] = useState<"none" | "keypad" | "transfer">("none");
  const [transferNumber, setTransferNumber] = useState("");
  const [transferMode, setTransferMode] = useState<"agent" | "external">("agent");
  const [transferType, setTransferType] = useState<"blind" | "attended">("attended");
  const [agents, setAgents] = useState<TransferAgent[] | null>(null);
  const [tones, setTones] = useState("");

  const showTransfer = panel === "transfer";
  const isActive = status === "active";
  const isRinging = status === "ringing" || status === "connecting";
  const isIncomingRinging = isRinging && direction === "incoming";

  // Leaving the active state closes the keypad / transfer panels.
  useEffect(() => {
    if (!isActive) setPanel("none");
  }, [isActive]);

  // Agent list for transfers: assignments + live online status, own user excluded.
  useEffect(() => {
    if (!showTransfer || agents !== null) return;
    let cancelled = false;
    Promise.all([
      axios.get("/api/phone-assignments/?is_active=true"),
      axios.get("/api/extensions/status/").catch(() => ({ data: { extensions: [] } })),
    ])
      .then(([assignRes, statusRes]) => {
        if (cancelled) return;
        const data = assignRes.data.results || assignRes.data || [];
        const onlineExts = new Set(
          (statusRes.data.extensions || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((e: any) => e.status === "online")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((e: any) => e.extension)
        );
        setAgents(
          data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((a: any) => a.user !== user?.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((a: any) => ({
              id: a.id,
              userId: a.user,
              name: a.user_name || t("ext", { ext: a.extension }),
              extension: a.extension,
              phone: a.phone_number,
              online: onlineExts.has(a.extension),
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showTransfer, agents, user?.id, t]);

  const transferTo = (number: string, name?: string) => {
    if (!number) return;
    if (transferType === "attended" && onStartAttendedTransfer) {
      onStartAttendedTransfer(number, name);
    } else {
      onTransfer?.(number);
    }
    setPanel("none");
    setTransferNumber("");
  };

  const sendTone = (key: string) => {
    onSendDTMF?.(key);
    setTones((prev) => prev + key);
  };

  const badge = callBadge(direction, status, isOnHold);
  const displayName = callerName || phoneNumber;
  const ringColor: CSSProperties = { ["--ring-c" as string]: direction === "incoming" ? "var(--green)" : "var(--foreground)" };

  return (
    <div className="flex flex-1 flex-col p-5" data-testid="softphone-in-call" data-call-status={status}>
      {/* top row */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {direction === "incoming" ? <PhoneIncoming className="h-[13px] w-[13px] shrink-0" /> : <PhoneOutgoing className="h-[13px] w-[13px] shrink-0" />}
          <span className="truncate">{direction === "incoming" ? t("incomingCall") : t("outgoingCall")}</span>
        </span>
        <span className="flex items-center gap-1">
          {onShowDetails && (
            <button
              type="button"
              onClick={onShowDetails}
              aria-label={t("callerDetails")}
              title={t("callerDetails")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="softphone-details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          <span
            className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold", BADGE_TONE[badge.tone])}
            aria-live="polite"
            data-testid="call-status-badge"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full bg-current", badge.tone === "ringing" && "motion-safe:animate-ed-blink-slow")} aria-hidden />
            {t(badge.key)}
          </span>
        </span>
      </div>

      {/* identity */}
      <div className="flex flex-col items-center gap-3.5 pb-7 pt-9 text-center">
        <span
          className={cn(
            "flex h-[84px] w-[84px] items-center justify-center rounded-full bg-primary/[.08] text-[26px] font-semibold text-primary",
            isRinging && "motion-safe:animate-ed-ring"
          )}
          style={isRinging ? ringColor : undefined}
          aria-hidden
          data-testid="call-avatar"
        >
          {callInitials(callerName || phoneNumber)}
        </span>
        <div className="min-w-0 max-w-full">
          <p className="truncate text-lg font-semibold leading-6">{displayName}</p>
          <p className="truncate text-[13px] text-muted-foreground tabular-nums">{callerName ? phoneNumber : t("unknownCaller")}</p>
        </div>
        <p
          className={cn("font-mono text-[22px] leading-7 tabular-nums", isActive ? "text-foreground" : "text-muted-foreground")}
          data-testid="call-timer"
        >
          {isRinging ? (direction === "incoming" ? t("ringing") : t("calling")) : formatMmSs(duration)}
        </p>
      </div>

      {isIncomingRinging ? (
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={onReject}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-destructive text-xs font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="softphone-decline"
          >
            <PhoneOff className="h-5 w-5" />
            {t("decline")}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-ed-green text-xs font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="softphone-accept"
          >
            <Phone className="h-5 w-5" />
            {t("accept")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ControlButton
              icon={isMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              label={isMuted ? t("unmute") : t("mute")}
              pressed={!!isMuted}
              disabled={!isActive}
              onClick={onToggleMute}
              testId="softphone-mute"
            />
            <ControlButton
              icon={isOnHold ? <Play className="h-[18px] w-[18px]" /> : <Pause className="h-[18px] w-[18px]" />}
              label={isOnHold ? t("resume") : t("hold")}
              pressed={!!isOnHold}
              disabled={!isActive}
              onClick={onToggleHold}
              testId="softphone-hold"
            />
            <ControlButton
              icon={<Grid3x3 className="h-[18px] w-[18px]" />}
              label={t("keypad")}
              pressed={panel === "keypad"}
              disabled={!isActive || !onSendDTMF}
              onClick={() => setPanel((p) => (p === "keypad" ? "none" : "keypad"))}
              testId="softphone-keypad"
            />
            <ControlButton
              icon={<PhoneForwarded className="h-[18px] w-[18px]" />}
              label={t("transfer")}
              pressed={showTransfer}
              disabled={!isActive || !onTransfer || transferPhase !== "idle"}
              onClick={() => setPanel((p) => (p === "transfer" ? "none" : "transfer"))}
              testId="softphone-transfer"
            />
          </div>

          {/* DTMF pad */}
          {panel === "keypad" && isActive && (
            <div className="mt-2.5" data-testid="softphone-dtmf">
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t("keypad")}>
                {DIAL_KEYS.map(({ key }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => sendTone(key)}
                    className="h-9 rounded-md border bg-background text-[15px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.97]"
                    data-dtmf-key={key}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <p className="mt-2 truncate text-center font-mono text-xs text-muted-foreground" aria-live="polite">
                {tones ? t("tonesSent", { tones: tones.slice(-12) }) : t("tonesHint")}
              </p>
            </div>
          )}

          {/* Transfer box */}
          {showTransfer && onTransfer && transferPhase === "idle" && (
            <div className="mt-2.5 rounded-lg border bg-background p-2.5" data-testid="softphone-transfer-box">
              <div className="mb-2 flex h-7 gap-0.5 rounded-md bg-muted p-0.5" role="radiogroup" aria-label={t("transferType")}>
                {(["attended", "blind"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={transferType === type}
                    onClick={() => setTransferType(type)}
                    className={cn(
                      "flex-1 rounded px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      transferType === type ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground"
                    )}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>

              {transferMode === "agent" ? (
                <>
                  <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("transferToAgent")}</p>
                  {agents && agents.length > 0 ? (
                    <ul className="flex max-h-40 flex-col overflow-y-auto">
                      {agents.map((agent) => (
                        <li key={agent.id}>
                          <button
                            type="button"
                            disabled={!agent.online}
                            onClick={() => transferTo(agent.extension, agent.name)}
                            className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left text-[13px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            data-testid="transfer-agent"
                          >
                            <span
                              className={cn("h-[7px] w-[7px] shrink-0 rounded-full", agent.online ? "bg-ed-green" : "bg-muted-foreground/50")}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                            <span className="sr-only">{agent.online ? t("online") : t("offline")}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{t("ext", { ext: agent.extension })}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : agents ? (
                    <p className="px-1 py-1 text-xs text-muted-foreground">{t("noAgents")}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setTransferMode("external")}
                    className="mt-1 h-7 w-full rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("transferToNumber")}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <input
                      type="tel"
                      autoFocus
                      value={transferNumber}
                      onChange={(e) => setTransferNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && transferNumber) transferTo(transferNumber);
                      }}
                      placeholder={t("numberPlaceholder")}
                      aria-label={t("numberPlaceholder")}
                      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => transferTo(transferNumber)}
                      disabled={!transferNumber}
                      aria-label={t("transfer")}
                      title={t("transfer")}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      data-testid="transfer-submit"
                    >
                      <PhoneForwarded className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferMode("agent")}
                    className="mt-1 h-7 w-full rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("transferToAgent")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Attended transfer in progress */}
          {transferPhase === "consulting" && consultationCall && (
            <div className="mt-2.5 flex flex-col gap-2" data-testid="softphone-consultation">
              <div className="rounded-lg border bg-muted/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("customerOnHold")}</span>
                  <span className={cn("rounded-full px-2 text-[11px] font-semibold leading-5", BADGE_TONE.held)}>{t("badgeOnHold")}</span>
                </div>
                <p className="mt-1 truncate text-[13px] font-medium">{callerName || phoneNumber}</p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/[.04] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("consultingWith")}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 text-[11px] font-semibold leading-5",
                      consultationCall.status === "active" ? BADGE_TONE.active : BADGE_TONE.ringing
                    )}
                    aria-live="polite"
                  >
                    {consultationCall.status === "connecting" && t("consultConnecting")}
                    {consultationCall.status === "ringing" && t("consultRinging")}
                    {consultationCall.status === "active" && t("consultActive")}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] font-medium">{consultationCall.targetName || consultationCall.targetNumber}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 [&>button]:flex-1 [&>button]:whitespace-nowrap [&>button]:px-2">
                <button
                  type="button"
                  onClick={onCancelTransfer}
                  className="flex h-8 items-center justify-center gap-1 rounded-md border bg-background text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("cancelTransfer")}
                </button>
                <button
                  type="button"
                  onClick={onCompleteTransfer}
                  disabled={consultationCall.status !== "active"}
                  title={t("completeTransfer")}
                  className="flex h-8 items-center justify-center gap-1 rounded-md bg-primary text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <PhoneForwarded className="h-3.5 w-3.5" />
                  {t("transfer")}
                </button>
                <button
                  type="button"
                  onClick={onMergeConference}
                  disabled={consultationCall.status !== "active"}
                  className="flex h-8 items-center justify-center gap-1 rounded-md border bg-background text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t("merge")}
                </button>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={onEndCall}
              disabled={status === "ending"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              data-testid="softphone-end"
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
