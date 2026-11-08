"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Check, ChevronDown, CircleCheck, Loader2, PhoneOff, Plus, Search, Settings, UserRound, X } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCallDay, formatMmSs } from "@/components/calls/call-format";
import { cn } from "@/lib/utils";
import { CallsHeaderBridge } from "./calls-header-bridge";
import { CallRow } from "./call-row";
import { CALL_TABS, groupByDay, searchParam, type CallLogRow, type CallTab } from "./calls-utils";
import { useCallAgents, useCallLogs, useCallTabCounts, useSaveCallNotes, useTodaySummary } from "./use-call-logs";

const TAB_LABEL: Record<CallTab, "tabAll" | "tabMissed" | "tabIncoming" | "tabOutgoing"> = {
  all: "tabAll",
  missed: "tabMissed",
  incoming: "tabIncoming",
  outgoing: "tabOutgoing",
};

const TOAST_MS = 2600;

/** The redesigned Calls screen: header bridge, tabs/agent/search toolbar, day-grouped history. */
export function CallsScreen() {
  const t = useTranslations("calls.page");
  const locale = useLocale();
  const { user } = useAuth();
  const isAdmin = !!(user?.is_staff || user?.is_superuser);
  const { openTicketCreate } = useTicketCreate();
  const {
    activeCall,
    sipRegistered,
    sipConnecting,
    activeSipConfig,
    loading: configLoading,
    error: callError,
    callEndedCounter,
    setDialNumber,
    setIsDialpadOpen,
    isDialpadOpen,
  } = useCall();

  const [tab, setTab] = useState<CallTab>("all");
  const [agentId, setAgentId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "warn" } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchParam(searchInput)), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const logsQuery = useCallLogs({ tab, agentId, search }, callEndedCounter);
  const { data: counts } = useCallTabCounts(agentId, search, callEndedCounter);
  const { data: today } = useTodaySummary(callEndedCounter);
  const { data: agents = [] } = useCallAgents();
  const saveNotes = useSaveCallNotes();

  const rows = useMemo<CallLogRow[]>(
    () => (logsQuery.data?.pages ?? []).flatMap((p) => p.results),
    [logsQuery.data]
  );
  const days = useMemo(() => groupByDay(rows), [rows]);

  // "New" chip: rows that appear after the first load (e.g. a call that just ended).
  const knownIds = useRef<Set<number> | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!logsQuery.data || logsQuery.isPlaceholderData) return;
    const ids = logsQuery.data.pages.flatMap((p) => p.results.map((r) => r.id));
    if (knownIds.current === null) {
      knownIds.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !knownIds.current!.has(id));
    if (fresh.length) {
      fresh.forEach((id) => knownIds.current!.add(id));
      setNewIds((prev) => new Set([...prev, ...fresh]));
    }
  }, [logsQuery.data, logsQuery.isPlaceholderData]);

  const showToast = useCallback((message: string, tone: "ok" | "warn" = "warn") => setToast({ message, tone }), []);

  const onNewCall = useCallback(() => {
    if (!activeSipConfig) {
      showToast(configLoading ? t("loadingConfig") : t("noConfig"));
      return;
    }
    // The softphone itself says when SIP is not registered.
    setIsDialpadOpen(true);
  }, [activeSipConfig, configLoading, setIsDialpadOpen, showToast, t]);

  const onCallBack = useCallback(
    (number: string) => {
      if (activeCall) {
        showToast(t("finishCurrentCall"));
        return;
      }
      if (!activeSipConfig) {
        showToast(t("noConfig"));
        return;
      }
      setDialNumber(number);
      setIsDialpadOpen(true);
    },
    [activeCall, activeSipConfig, setDialNumber, setIsDialpadOpen, showToast, t]
  );

  const onSaveNotes = useCallback(
    async (id: number, notes: string) => {
      try {
        await saveNotes.mutateAsync({ id, notes });
        showToast(t("noteSaved"), "ok");
      } catch {
        showToast(t("noteSaveFailed"));
      }
    },
    [saveNotes, showToast, t]
  );

  const agentName = agents.find((a) => a.id === agentId)?.name;
  const filtered = tab !== "all" || agentId != null || !!search;

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden" data-testid="calls-screen">
      <CallsHeaderBridge
        sipRegistered={sipRegistered}
        sipConnecting={sipConnecting}
        extension={activeSipConfig?.username}
        showSip={!!activeSipConfig}
        isAdmin={isAdmin}
        onNewCall={onNewCall}
      />

      {/* toolbar */}
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b px-4 py-1.5">
        <div className="scrollbar-hide inline-flex h-7 max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-md bg-muted p-0.5" role="tablist" aria-label={t("tabsLabel")}>
          {CALL_TABS.map((key) => {
            const count = counts?.[key] ?? 0;
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setTab(key);
                  setExpandedId(null);
                }}
                data-testid={`calls-tab-${key}`}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(TAB_LABEL[key])}
                {count > 0 && <span className="tabular-nums text-muted-foreground">{count}</span>}
              </button>
            );
          })}
        </div>

        {agents.length > 0 && (
          <>
            <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={agentName ? `${t("agentFilter")}: ${agentName}` : t("agentFilter")}
                  data-testid="calls-agent-filter"
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-2.5 pr-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    agentName ? "border bg-muted" : "border border-dashed"
                  )}
                >
                  <UserRound className="h-[13px] w-[13px]" />
                  <span className="text-foreground">{t("agent")}</span>
                  {agentName ? (
                    <>
                      <span className="max-w-[140px] truncate border-l pl-1.5 font-medium text-foreground">{agentName}</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 min-w-48 overflow-y-auto">
                <DropdownMenuItem onSelect={() => setAgentId(null)} className="gap-2 text-[13px]">
                  <Check className={cn("h-3.5 w-3.5", agentId != null && "invisible")} />
                  {t("allAgents")}
                </DropdownMenuItem>
                {agents.map((a) => (
                  <DropdownMenuItem key={a.id} onSelect={() => setAgentId(a.id)} className="gap-2 text-[13px]" data-testid="calls-agent-option">
                    <Check className={cn("h-3.5 w-3.5", agentId !== a.id && "invisible")} />
                    {a.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {agentName && (
              <button
                type="button"
                onClick={() => setAgentId(null)}
                aria-label={t("allAgents")}
                title={t("allAgents")}
                className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {today && (
            <span className="hidden whitespace-nowrap text-xs text-muted-foreground tabular-nums lg:inline" data-testid="calls-summary">
              {t("summary", { total: today.total, missed: today.missed, avg: formatMmSs(today.avgSeconds) })}
            </span>
          )}
          <div className="relative w-full sm:w-[220px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              data-testid="calls-search"
              className="h-7 w-full rounded-md border border-input bg-background pl-[26px] pr-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </div>
      </div>

      {/* SIP config / error notices */}
      {!configLoading && !activeSipConfig && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground" data-testid="calls-no-config">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{t("noConfig")}</span>
          {isAdmin && (
            <Link
              href="/settings/calls"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2.5 font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="h-3.5 w-3.5" />
              {t("configureSip")}
            </Link>
          )}
        </div>
      )}
      {/* (the open softphone shows the same error itself) */}
      {callError && !isDialpadOpen && (
        <div role="alert" className="flex shrink-0 items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{callError}</span>
        </div>
      )}

      {/* list */}
      <div className="min-h-0 flex-1 overflow-auto" data-testid="calls-list">
        {logsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : logsQuery.isError && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{t("loadFailed")}</p>
            <button
              type="button"
              onClick={() => logsQuery.refetch()}
              className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium hover:bg-muted"
            >
              {t("retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-16 text-center" data-testid="calls-empty">
            <PhoneOff className="mb-1 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{t("emptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{filtered || searchInput ? t("emptyFiltered") : t("emptyNone")}</p>
          </div>
        ) : (
          <>
            {days.map((day) => (
              <div key={day.key} role="group" aria-labelledby={`calls-day-${day.key}`}>
                <div
                  id={`calls-day-${day.key}`}
                  className="sticky top-0 z-[1] flex h-[30px] items-center gap-1.5 border-b bg-muted/60 px-4 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground backdrop-blur-[4px]"
                  data-testid="calls-day"
                >
                  <span>{day.kind === "today" ? t("today") : day.kind === "yesterday" ? t("yesterday") : formatCallDay(day.date, locale)}</span>
                  <span className="font-medium tabular-nums">{day.items.length}</span>
                </div>
                {day.items.map((log) => (
                  <CallRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    isNew={newIds.has(log.id)}
                    playingId={playingId}
                    onToggle={() => setExpandedId((id) => (id === log.id ? null : log.id))}
                    onPlay={setPlayingId}
                    onCallBack={onCallBack}
                    onSaveNotes={onSaveNotes}
                    onCreateTicket={() => openTicketCreate()}
                    savingNotes={saveNotes.isPending && saveNotes.variables?.id === log.id}
                  />
                ))}
              </div>
            ))}
            {logsQuery.hasNextPage && (
              <div className="flex px-4 py-3">
                <button
                  type="button"
                  onClick={() => logsQuery.fetchNextPage()}
                  disabled={logsQuery.isFetchingNextPage}
                  className="mx-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  data-testid="calls-load-more"
                >
                  {logsQuery.isFetchingNextPage && <Loader2 className="h-3 w-3 animate-spin" />}
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-4 left-1/2 z-[60] flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-background px-4 py-3 text-[13px] font-medium shadow-lg"

          data-testid="calls-toast"
        >
          {toast.tone === "ok" ? (
            <CircleCheck className="h-4 w-4 shrink-0 text-ed-green" aria-hidden />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          {toast.message}
        </div>
      )}
    </section>
  );
}
