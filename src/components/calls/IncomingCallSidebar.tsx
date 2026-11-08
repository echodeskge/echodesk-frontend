"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneForwarded,
  Mic,
  MicOff,
  Pause,
  Play,
  User,
  Users,
  Mail,
  Clock,
  FileText,
  Plus,
  ExternalLink,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIncomingCallSidebar } from "@/contexts/IncomingCallSidebarContext";
import { useCall } from "@/contexts/CallContext";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { callLogsPartialUpdate } from "@/api/generated/api";
import type {
  Client,
  CallLog,
  PaginatedCallLogList,
  PaginatedTicketListList,
  TicketList,
} from "@/api/generated/interfaces";
import axios from "@/api/axios";
import { format } from "date-fns";
import { statusLabelKey } from "./call-format";

interface PhoneLookupResponse {
  results: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    company: string;
    source: 'crm' | 'social';
  }>;
  count: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function IncomingCallSidebar() {
  const t = useTranslations("calls");
  const router = useRouter();
  const { isOpen, callLogId, phoneNumber, clientName, closeSidebar } =
    useIncomingCallSidebar();
  const {
    activeCall, callDuration, handleEndCall, handleToggleMute, handleToggleHold,
    startAttendedTransfer, completeTransfer, cancelTransfer, mergeConference,
  } = useCall();
  const { openTicketCreate } = useTicketCreate();

  const [client, setClient] = useState<Client | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketList[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");

  // Fetch client + related data when sidebar opens
  const fetchData = useCallback(async () => {
    if (!phoneNumber) return;

    setLoading(true);
    try {
      // Look up the caller by phone — the backend matches on the last 7
      // digits across both crm.Client and SocialIntegration.SocialClient,
      // so a number like "597147515" finds a stored "+995597147515".
      const lookupResp = await axios.get<PhoneLookupResponse>(
        `/api/clients/lookup-by-phone/?phone=${encodeURIComponent(phoneNumber)}`
      );
      const matched = lookupResp.data.results?.[0] || null;
      const matchedClient = matched
        ? ({
            id: matched.id,
            name: matched.name,
            email: matched.email,
            phone: matched.phone,
            company: matched.company,
            // The Client interface has more fields (created_at/updated_at/is_active)
            // — fill harmless defaults so the existing UI keeps reading .name etc.
          } as Client)
        : null;
      setClient(matchedClient);

      // Fetch recent tickets if client found
      if (matchedClient) {
        try {
          // Named params (WS2): the generated ticketsList takes positional
          // arguments whose order shifts whenever a filter is documented.
          const { data: ticketsResult } = await axios.get<PaginatedTicketListList>(
            "/api/tickets/",
            { params: { search: matchedClient.name, page_size: 5, ordering: "-created_at" } }
          );
          setRecentTickets(ticketsResult.results || []);
        } catch {
          setRecentTickets([]);
        }
      } else {
        setRecentTickets([]);
      }

      // Fetch recent calls with this number
      try {
        // Named query params: the generated callLogsList takes positional
        // arguments whose order shifts whenever a filter is added.
        const { data: callsResult } = await axios.get<PaginatedCallLogList>(
          "/api/call-logs/",
          { params: { ordering: "-started_at", page: 1, page_size: 6, search: phoneNumber } }
        );
        setRecentCalls(
          (callsResult.results || []).filter((c) => c.id !== callLogId).slice(0, 5)
        );
      } catch {
        setRecentCalls([]);
      }
    } catch {
      // Silently fail on lookup
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, callLogId]);

  useEffect(() => {
    if (isOpen && phoneNumber) {
      fetchData();
      setNotesText("");
    }
  }, [isOpen, phoneNumber, fetchData]);

  const handleSaveNotes = async () => {
    if (!callLogId) return;
    setSavingNotes(true);
    try {
      await callLogsPartialUpdate(callLogId, { notes: notesText });
      toast.success(t("callDetail.savedNotes"));
    } catch {
      toast.error(t("callDetail.saveNotesFailed"));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCreateTicket = () => {
    openTicketCreate();
  };

  const isCallActive =
    activeCall &&
    (activeCall.status === "active" || activeCall.status === "ringing");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSidebar()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 flex flex-col"
      >
        {/* Header — Caller Info + Call Controls */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[.08] text-primary">
                {isCallActive ? (
                  activeCall?.direction === "outgoing" ? (
                    <PhoneOutgoing className="h-[18px] w-[18px]" />
                  ) : (
                    <PhoneIncoming className="h-[18px] w-[18px]" />
                  )
                ) : (
                  <Phone className="h-[18px] w-[18px] text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold leading-5">
                  {clientName || client?.name || t("callDetail.unknownCaller")}
                </h3>
                <p className="text-[13px] text-muted-foreground tabular-nums">{phoneNumber}</p>
              </div>
            </div>
            {/* SheetContent already renders a close X in the top-right corner;
                no need for a second one here. */}
          </div>

          {/* Active Call Controls */}
          {isCallActive && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  aria-live="polite"
                  className={
                    activeCall.status === "ringing"
                      ? "inline-flex h-[22px] items-center gap-1.5 rounded-full bg-primary/[.08] px-2 text-[11px] font-semibold text-foreground"
                      : activeCall.isOnHold
                        ? "inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#fd7e1420] px-2 text-[11px] font-semibold text-[#c2410c] dark:text-orange-400"
                        : "inline-flex h-[22px] items-center gap-1.5 rounded-full bg-ed-green/12 px-2 font-mono text-[11px] font-semibold text-ed-green tabular-nums"
                  }
                >
                  <span className={activeCall.status === "ringing" ? "h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-ed-blink-slow" : "h-1.5 w-1.5 rounded-full bg-current"} aria-hidden />
                  {activeCall.status === "ringing"
                    ? t("phone.badgeIncoming")
                    : activeCall.isOnHold
                      ? t("phone.badgeOnHold")
                      : formatDuration(callDuration)}
                </span>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleMute}
                  title={activeCall.isMuted ? t("phone.unmute") : t("phone.mute")}
                  aria-label={activeCall.isMuted ? t("phone.unmute") : t("phone.mute")}
                  aria-pressed={!!activeCall.isMuted}
                >
                  {activeCall.isMuted ? (
                    <MicOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleToggleHold}
                  title={activeCall.isOnHold ? t("phone.resume") : t("phone.hold")}
                  aria-label={activeCall.isOnHold ? t("phone.resume") : t("phone.hold")}
                  aria-pressed={!!activeCall.isOnHold}
                >
                  {activeCall.isOnHold ? (
                    <Play className="h-4 w-4 text-[#c2410c] dark:text-orange-400" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant={showTransfer ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowTransfer(!showTransfer)}
                  disabled={activeCall.status !== "active" || activeCall.transferPhase === "consulting"}
                  title={t("phone.transfer")}
                  aria-label={t("phone.transfer")}
                  aria-pressed={showTransfer}
                >
                  <PhoneForwarded className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleEndCall}
                  title={t("phone.endCall")}
                  aria-label={t("phone.endCall")}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>

              {/* Transfer input */}
              {showTransfer && activeCall.status === "active" && activeCall.transferPhase === "idle" && (
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder={t("dashboard.transferTo")}
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    className="text-sm h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && transferNumber) {
                        startAttendedTransfer(transferNumber).catch(() => {});
                        setShowTransfer(false);
                        setTransferNumber("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={!transferNumber}
                    onClick={() => {
                      startAttendedTransfer(transferNumber).catch(() => {});
                      setShowTransfer(false);
                      setTransferNumber("");
                    }}
                  >
                    <PhoneForwarded className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Consultation state */}
              {activeCall.transferPhase === "consulting" && activeCall.consultationCall && (
                <div className="space-y-2">
                  <div className="rounded-md border bg-muted p-2 text-xs">
                    <span className="text-muted-foreground">{t("dashboard.consultingWith")}: </span>
                    <span className="font-medium">
                      {activeCall.consultationCall.targetName || activeCall.consultationCall.targetNumber}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {activeCall.consultationCall.status === "connecting" && t("dashboard.connecting")}
                      {activeCall.consultationCall.status === "ringing" && t("dashboard.ringing")}
                      {activeCall.consultationCall.status === "active" && t("dashboard.active")}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => cancelTransfer().catch(() => {})}>
                      <X className="h-3 w-3 mr-1" />
                      {t("dashboard.cancelTransfer")}
                    </Button>
                    <Button size="sm" className="flex-1 h-7 text-xs" disabled={activeCall.consultationCall.status !== "active"} onClick={() => completeTransfer().catch(() => {})}>
                      <PhoneForwarded className="h-3 w-3 mr-1" />
                      {t("dashboard.completeTransfer")}
                    </Button>
                    <Button variant="secondary" size="sm" className="h-7 text-xs" disabled={activeCall.consultationCall.status !== "active"} onClick={() => mergeConference().catch(() => {})}>
                      <Users className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                {/* Client Card */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
                    {t("callDetail.clientInfo")}
                  </h4>
                  {client ? (
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          {client.company && (
                            <p className="text-xs text-muted-foreground truncate">
                              {client.company}
                            </p>
                          )}
                        </div>
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs mt-1"
                        onClick={() => {
                          router.push(`/clients/${client.id}`);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t("callDetail.viewProfile")}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("callDetail.unknownCaller")}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {phoneNumber}
                      </p>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Recent Tickets */}
                {client && (
                  <>
                    <section>
                      <h4 className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
                        <FileText className="h-3 w-3" aria-hidden />
                        {t("callDetail.recentTickets")}
                      </h4>
                      {recentTickets.length > 0 ? (
                        <div className="space-y-1.5">
                          {recentTickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              type="button"
                              onClick={() => router.push(`/boards`)}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="text-xs font-mono text-muted-foreground">
                                #{ticket.id}
                              </span>
                              <span className="text-sm truncate flex-1">
                                {ticket.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4"
                              >
                                {ticket.status}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">
                          {t("callDetail.noTickets")}
                        </p>
                      )}
                    </section>
                    <Separator />
                  </>
                )}

                {/* Call History with This Number */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    {t("callDetail.recentCalls")}
                  </h4>
                  {recentCalls.length > 0 ? (
                    <div className="space-y-1">
                      {recentCalls.map((call) => {
                        const dir = String(call.direction ?? '');
                        const st = String(call.status ?? '');
                        const isMissed = st === "missed" || st === "no_answer";
                        return (
                          <div
                            key={call.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm"
                          >
                            {isMissed ? (
                              <PhoneMissed className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                            ) : dir === "inbound" ? (
                              <PhoneIncoming className="h-3.5 w-3.5 shrink-0 text-ed-green" />
                            ) : (
                              <PhoneOutgoing className="h-3.5 w-3.5 shrink-0 text-[#2563eb] dark:text-[#60a5fa]" />
                            )}
                            <span className="text-xs text-muted-foreground flex-1">
                              {format(new Date(call.started_at), "MMM d, h:mm a")}
                            </span>
                            <Badge
                              variant={isMissed ? "destructive" : "secondary"}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {statusLabelKey(st) ? t(`logs.${statusLabelKey(st)}`) : st}
                            </Badge>
                            {call.duration_display && (
                              <span className="text-[10px] text-muted-foreground">
                                {call.duration_display}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      {t("callDetail.noRecentCalls")}
                    </p>
                  )}
                </section>

                <Separator />

                {/* Notes */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
                    {t("callDetail.notes")}
                  </h4>
                  <Textarea
                    aria-label={t("callDetail.notes")}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder={t("logs.notesPlaceholder")}
                    className="text-sm min-h-[80px] resize-none"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={savingNotes || !notesText.trim()}
                    className="mt-2 h-7"
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {t("callDetail.saveNotes")}
                  </Button>
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer — Quick Actions */}
        <div className="p-3 border-t flex-shrink-0 space-y-2">
          <Button
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={handleCreateTicket}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("callDetail.createTicket")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
