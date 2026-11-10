"use client";

import { useTranslations } from "next-intl";
import { PhoneForwarded, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveCall, ConsultationCall } from "@/contexts/call-types";
import { BADGE_TONE } from "./in-call-view";
import { useCallActions } from "./use-rail-call";

/**
 * Attended transfer in progress: the customer on hold, the consulted agent's
 * state and Cancel / Complete / Merge. Complete and Merge wait for the
 * consultation leg to be answered. Failures surface through CallContext's
 * `error`; the promises are not awaited here.
 */
export function ConsultationBar({ call, consultation }: { call: ActiveCall; consultation: ConsultationCall }) {
  const t = useTranslations("calls.rail");
  const { cancelTransfer, completeTransfer, mergeConference } = useCallActions();
  const consultActive = consultation.status === "active";

  return (
    <div className="mt-2.5 flex flex-col gap-2" data-testid="call-rail-consultation">
      <div className="rounded-lg border bg-muted/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("customerOnHold")}</span>
          <span className={cn("rounded-full px-2 text-[11px] font-semibold leading-5", BADGE_TONE.held)}>{t("badgeOnHold")}</span>
        </div>
        <p className="mt-1 truncate text-[13px] font-medium">{call.callerName || call.number}</p>
      </div>
      <div className="rounded-lg border border-primary/40 bg-primary/[.04] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("consultingWith")}</span>
          <span
            className={cn("rounded-full px-2 text-[11px] font-semibold leading-5", consultActive ? BADGE_TONE.active : BADGE_TONE.ringing)}
            aria-live="polite"
            data-testid="call-rail-consultation-status"
            data-status={consultation.status}
          >
            {consultation.status === "connecting" && t("consultConnecting")}
            {consultation.status === "ringing" && t("consultRinging")}
            {consultation.status === "active" && t("consultActive")}
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] font-medium">{consultation.targetName || consultation.targetNumber}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 [&>button]:flex-1 [&>button]:whitespace-nowrap [&>button]:px-2">
        <button
          type="button"
          onClick={() => cancelTransfer().catch(() => {})}
          className="flex h-8 items-center justify-center gap-1 rounded-md border bg-background text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="call-rail-consult-cancel"
        >
          <X className="h-3.5 w-3.5" />
          {t("cancelTransfer")}
        </button>
        <button
          type="button"
          onClick={() => completeTransfer().catch(() => {})}
          disabled={!consultActive}
          title={t("completeTransfer")}
          className="flex h-8 items-center justify-center gap-1 rounded-md bg-primary text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          data-testid="call-rail-consult-complete"
        >
          <PhoneForwarded className="h-3.5 w-3.5" />
          {t("transfer")}
        </button>
        <button
          type="button"
          onClick={() => mergeConference().catch(() => {})}
          disabled={!consultActive}
          className="flex h-8 items-center justify-center gap-1 rounded-md border bg-background text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          data-testid="call-rail-consult-merge"
        >
          <Users className="h-3.5 w-3.5" />
          {t("merge")}
        </button>
      </div>
    </div>
  );
}
