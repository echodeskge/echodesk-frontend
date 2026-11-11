"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Mail, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Plus, Save, User } from "lucide-react";
import { RailSection } from "@/components/chat/client-rail-sections";
import { ErrorBlock, LoadingBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import type { ActiveCall } from "@/contexts/call-types";
import { cn } from "@/lib/utils";
import { formatCallDateTime, isMissedStatus, statusLabelKey } from "../call-format";
import { useCallerContext, type CallerClient } from "./use-caller-context";

/** Clients screen deep link (there is no `/clients/{id}` route; the Clients page opens the rail from `?client=`). */
export function clientProfileHref(client: CallerClient): string {
  return `/social/clients?client=${client.id}`;
}

function ClientCard({ client }: { client: CallerClient }) {
  const t = useTranslations("calls.rail");
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3" data-testid="call-rail-client">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{client.name}</p>
          {client.company && <p className="truncate text-[11px] text-muted-foreground">{client.company}</p>}
        </div>
      </div>
      {client.email && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{client.email}</span>
        </p>
      )}
      {client.phone && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          <span>{client.phone}</span>
        </p>
      )}
      {client.source === "social" && (
        <Link href={clientProfileHref(client)} className={cn(rdButton.outlineSm, "mt-1 w-full")} data-testid="call-rail-view-profile">
          <ExternalLink className="h-3 w-3" aria-hidden />
          {t("viewProfile")}
        </Link>
      )}
    </div>
  );
}

/**
 * Caller context below the softphone during a call: client card (lookup by
 * phone with retry on failure), recent tickets by client id, recent calls
 * with the number, call notes and Create ticket with the caller prefilled.
 */
export function CallerContext({ call }: { call: ActiveCall }) {
  const t = useTranslations("calls.rail");
  const locale = useLocale();
  const { openTicketCreate } = useTicketCreate();
  const { lookup, client, tickets, recentCalls, saveNotes } = useCallerContext(call.number, call.logId);
  const [notes, setNotes] = useState("");
  const [notesState, setNotesState] = useState<"idle" | "saved" | "error">("idle");

  // A new call starts with empty notes.
  useEffect(() => {
    setNotes("");
    setNotesState("idle");
  }, [call.id]);

  const notesDisabled = call.logPending || !call.logId;

  const handleCreateTicket = () => {
    const title = (call.callerName || client?.name || call.number || "").trim();
    openTicketCreate(undefined, undefined, {
      ...(title ? { title } : {}),
      ...(client && client.source === "social" ? { customerId: client.id } : {}),
    });
  };

  const handleSaveNotes = () => {
    if (!call.logId) return;
    saveNotes.mutate(
      { id: call.logId, notes },
      {
        onSuccess: () => setNotesState("saved"),
        onError: () => setNotesState("error"),
      }
    );
  };

  const errorLabels = {
    errorTitle: t("lookupFailed"),
    errorHint: t("lookupFailedHint"),
    noAccessTitle: t("noAccessTitle"),
    noAccessHint: t("noAccessHint"),
    retry: t("retry"),
  };

  return (
    <div className="flex flex-col gap-5 border-t px-5 py-4" data-testid="call-rail-context">
      <RailSection title={t("clientInfo")} testId="call-rail-context-client">
        {lookup.isPending ? (
          <LoadingBlock label={t("loading")} className="py-4" testId="call-rail-context-loading" />
        ) : lookup.isError ? (
          <ErrorBlock
            error={lookup.error}
            onRetry={() => {
              void lookup.refetch();
            }}
            labels={errorLabels}
            className="py-4"
            testId="call-rail-context-error"
          />
        ) : client ? (
          <ClientCard client={client} />
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-center" data-testid="call-rail-unknown-caller">
            <p className="text-[13px] font-medium">{call.callerName || t("unknownCaller")}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{call.number}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{t("unknownCallerHint")}</p>
          </div>
        )}
      </RailSection>

      {client && (
        <RailSection title={t("recentTickets")} testId="call-rail-context-tickets">
          {client.source !== "social" ? (
            <p className="text-xs text-muted-foreground">{t("noLinkedTickets")}</p>
          ) : tickets.isPending ? (
            <LoadingBlock label={t("loading")} className="py-2" />
          ) : tickets.data && tickets.data.length > 0 ? (
            <ul className="flex flex-col">
              {tickets.data.slice(0, 5).map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="flex h-8 items-center gap-2 rounded-md px-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid={`call-rail-ticket-${ticket.id}`}
                  >
                    <span className="font-mono text-xs text-muted-foreground">#{ticket.id}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{ticket.title ?? `#${ticket.id}`}</span>
                    {ticket.column && <span className="rounded border px-1.5 text-[10px] leading-4 text-muted-foreground">{ticket.column}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noTickets")}</p>
          )}
        </RailSection>
      )}

      <RailSection title={t("recentCalls")} testId="call-rail-context-calls">
        {recentCalls.isPending ? (
          <LoadingBlock label={t("loading")} className="py-2" />
        ) : recentCalls.data && recentCalls.data.length > 0 ? (
          <ul className="flex flex-col">
            {recentCalls.data.map((log) => {
              const status = String(log.status ?? "");
              const direction = String(log.direction ?? "");
              const missed = isMissedStatus(status);
              const labelKey = statusLabelKey(status);
              return (
                <li key={log.id} className="flex h-8 items-center gap-2 px-2 text-xs" data-testid="call-rail-recent-call">
                  {missed ? (
                    <PhoneMissed className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                  ) : direction === "inbound" ? (
                    <PhoneIncoming className="h-3.5 w-3.5 shrink-0 text-ed-green" aria-hidden />
                  ) : (
                    <PhoneOutgoing className="h-3.5 w-3.5 shrink-0 text-[#2563eb] dark:text-[#60a5fa]" aria-hidden />
                  )}
                  <span className="flex-1 text-muted-foreground tabular-nums">{formatCallDateTime(new Date(log.started_at), locale)}</span>
                  <span className={cn("rounded border px-1.5 text-[10px] leading-4", missed ? "border-destructive/40 text-destructive" : "text-muted-foreground")}>
                    {labelKey ? t(`status.${labelKey}`) : status}
                  </span>
                  {log.duration_display && <span className="font-mono text-[10px] text-muted-foreground">{log.duration_display}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("noRecentCalls")}</p>
        )}
      </RailSection>

      <RailSection title={t("notes")} testId="call-rail-context-notes">
        <textarea
          value={notes}
          rows={3}
          disabled={notesDisabled}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesState("idle");
          }}
          placeholder={t("notesPlaceholder")}
          aria-label={t("notes")}
          data-testid="call-rail-notes"
          className="resize-y rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={notesDisabled || saveNotes.isPending || !notes.trim()}
            className={rdButton.primarySm}
            data-testid="call-rail-notes-save"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {t("saveNotes")}
          </button>
          {notesDisabled ? (
            <span className="text-[11px] text-muted-foreground">{t("notesPending")}</span>
          ) : notesState !== "idle" ? (
            <span className={cn("text-[11px]", notesState === "error" ? "text-destructive" : "text-muted-foreground")} role="status">
              {notesState === "error" ? t("notesSaveFailed") : t("notesSaved")}
            </span>
          ) : null}
        </div>
      </RailSection>

      <button type="button" onClick={handleCreateTicket} className={cn(rdButton.outline, "w-full")} data-testid="call-rail-create-ticket">
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t("createTicket")}
      </button>
    </div>
  );
}
