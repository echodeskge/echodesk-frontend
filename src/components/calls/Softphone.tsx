"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, X } from "lucide-react";
import type { CallContextValue } from "@/contexts/CallContext";
import { ActiveCallDisplay } from "./ActiveCallDisplay";
import { DialPad, type RecentContact } from "./DialPad";
import { SipStatusIndicator } from "./SipStatusIndicator";

export type SoftphoneCall = Pick<
  CallContextValue,
  | "activeCall"
  | "callDuration"
  | "sipRegistered"
  | "sipConnecting"
  | "activeSipConfig"
  | "dialNumber"
  | "setDialNumber"
  | "makeCall"
  | "handleAcceptCall"
  | "handleRejectCall"
  | "handleEndCall"
  | "handleToggleHold"
  | "handleToggleMute"
  | "sendDTMF"
  | "transferCall"
  | "startAttendedTransfer"
  | "completeTransfer"
  | "cancelTransfer"
  | "mergeConference"
  | "error"
>;

interface SoftphoneProps {
  call: SoftphoneCall;
  /** Closes the panel when idle, minimises it (call keeps running) otherwise. */
  onClose: () => void;
  matchedName?: string | null;
  recents?: RecentContact[];
  /** Opens the caller details sheet for the current call. */
  onShowDetails?: () => void;
}

// Transfer helpers swallow rejections: CallContext already reports the
// failure through `error`, which the panel shows.
const quiet =
  <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
  (...args: A) => {
    fn(...args).catch(() => {});
  };

/**
 * The softphone panel (EchoDesk Redesign): SIP pill + minimise/close header,
 * error strip, then the idle keypad or the in-call view. Presentational: it
 * renders whatever CallContext state it is given, so it can be shown in the
 * dock popup and tested with a mocked context.
 */
export function Softphone({ call, onClose, matchedName, recents, onShowDetails }: SoftphoneProps) {
  const t = useTranslations("calls.phone");
  const { activeCall } = call;
  const closeLabel = activeCall ? t("minimize") : t("close");

  return (
    <div className="flex w-full flex-col" data-testid="softphone">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <SipStatusIndicator
          isRegistered={call.sipRegistered}
          isConnecting={call.sipConnecting}
          extension={call.activeSipConfig?.username}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="softphone-close"
        >
          {activeCall ? <ChevronDown className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {call.error && (
        <div role="alert" title={call.error} className="mx-3 mt-3 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <span className="line-clamp-2 break-words">{call.error}</span>
        </div>
      )}

      {activeCall ? (
        <ActiveCallDisplay
          phoneNumber={activeCall.number}
          callerName={activeCall.callerName}
          direction={activeCall.direction}
          status={activeCall.status === "idle" ? "connecting" : activeCall.status}
          duration={call.callDuration}
          isOnHold={activeCall.isOnHold}
          isMuted={activeCall.isMuted}
          onAccept={call.handleAcceptCall}
          onReject={call.handleRejectCall}
          onEndCall={call.handleEndCall}
          onToggleHold={call.handleToggleHold}
          onToggleMute={call.handleToggleMute}
          onSendDTMF={call.sendDTMF}
          onTransfer={quiet(call.transferCall)}
          transferPhase={activeCall.transferPhase}
          consultationCall={activeCall.consultationCall}
          onStartAttendedTransfer={quiet(call.startAttendedTransfer)}
          onCompleteTransfer={quiet(call.completeTransfer)}
          onCancelTransfer={quiet(call.cancelTransfer)}
          onMergeConference={quiet(call.mergeConference)}
          onShowDetails={activeCall.logId ? onShowDetails : undefined}
        />
      ) : (
        <DialPad
          value={call.dialNumber}
          onChange={call.setDialNumber}
          onCall={call.makeCall}
          disabled={!call.sipRegistered}
          matchedName={matchedName}
          recents={recents}
        />
      )}
    </div>
  );
}
