"use client";

/**
 * Personal timer data and writes (plan U1, A14, E32, FE-13).
 *
 * Clock rule (RM1): nothing here trusts the client clock's absolute value.
 * Every timer payload carries `server_now`; the query functions stamp the
 * local receive time (`fetched_at`), and live values are
 * `server value + (Date.now() - fetched_at)`. A client clock that is hours
 * off therefore still ticks the right elapsed time.
 *
 * Exports used by other packages:
 * - `useTicketTimer(id)`: the `tk.timer(id)` query. FE-11's Time tab count is
 *   `data?.entries.length`.
 * - `useTicketTimeSummary(id)`: the `tk.timeSummary(id)` query (time in status).
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { errorStatus, getTimeSummary, timerGet, timerStart, timerStop } from "../_lib/api";
import { newMutationId, rememberMutation } from "../_lib/mutation-id";
import { tk } from "../_lib/query-keys";
import type { TimeEntry, TimerConflict, TimerState, TimeSummary } from "../_lib/types";
import { retryUnlessDenied } from "./use-ticket";

/** A timer payload plus the local time (ms) it was received. */
export type TimerSnapshot = TimerState & { fetched_at: number };
export type TimeSummarySnapshot = TimeSummary & { fetched_at: number };

/** After this many seconds of one running entry the button warns (FE-13). */
export const LONG_RUNNING_SECONDS = 8 * 3600;

function validId(id: number | null | undefined): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

function parseMs(value: string | null | undefined): number {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : NaN;
}

/** Seconds since the snapshot was received (never negative). */
export function secondsSinceFetch(snapshot: { fetched_at: number }, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - snapshot.fetched_at) / 1000));
}

/** The server's "now" right now, estimated from the snapshot (ms). */
export function serverNowMs(snapshot: { server_now: string; fetched_at: number }, now: number = Date.now()): number {
  const base = parseMs(snapshot.server_now);
  return (Number.isFinite(base) ? base : snapshot.fetched_at) + Math.max(0, now - snapshot.fetched_at);
}

/** Live elapsed seconds of a running entry, on the server clock. */
export function entryElapsedSeconds(
  entry: Pick<TimeEntry, "started_at" | "duration_seconds" | "is_running" | "ended_at">,
  snapshot: { server_now: string; fetched_at: number },
  now: number = Date.now(),
): number {
  if (!entry.is_running && entry.ended_at) return Math.max(0, entry.duration_seconds || 0);
  const started = parseMs(entry.started_at);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((serverNowMs(snapshot, now) - started) / 1000));
}

/** Users with a running entry in the snapshot (null = a deleted user). */
function runningUserIds(snapshot: TimerSnapshot): Array<number | null> {
  return snapshot.entries.filter((e) => e.is_running).map((e) => e.user?.id ?? null);
}

/**
 * Live totals. The server totals already include running entries up to
 * `server_now`; each running entry adds the time since the fetch.
 */
export function liveTotals(snapshot: TimerSnapshot, now: number = Date.now()) {
  const delta = secondsSinceFetch(snapshot, now);
  const running = runningUserIds(snapshot);
  const mine = snapshot.my_total_seconds + (snapshot.running ? delta : 0);
  // The caller's running entry may be older than the latest 50 entries.
  const extraMine = snapshot.running && !snapshot.entries.some((e) => e.id === snapshot.running?.id) ? 1 : 0;
  const total = snapshot.total_seconds + delta * (running.length + extraMine);
  const byUser = snapshot.by_user.map((row) => {
    const uid = row.user?.id ?? null;
    const n = running.filter((r) => r === uid).length;
    return { ...row, seconds: row.seconds + delta * n };
  });
  return { mine, total, byUser };
}

/** Fill missing fields, so an unexpected payload never breaks the header. */
export function normalizeTimerState(raw: Partial<TimerState> | null | undefined, fetchedAt: number): TimerSnapshot {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    running: raw?.running ?? null,
    my_total_seconds: num(raw?.my_total_seconds),
    total_seconds: num(raw?.total_seconds),
    server_now: typeof raw?.server_now === "string" ? raw.server_now : new Date(fetchedAt).toISOString(),
    by_user: Array.isArray(raw?.by_user) ? raw.by_user : [],
    entries: Array.isArray(raw?.entries) ? raw.entries : [],
    fetched_at: fetchedAt,
  };
}

/** The `tk.timer(id)` query (A14). */
export function useTicketTimer(id: number | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<TimerSnapshot>({
    queryKey: tk.timer(id ?? 0),
    queryFn: async () => normalizeTimerState(await timerGet(id as number), Date.now()),
    enabled: options.enabled !== false && validId(id),
    retry: retryUnlessDenied,
    staleTime: 30_000,
  });
}

/** The `tk.timeSummary(id)` query (`time-logs/ticket_summary/`). */
export function useTicketTimeSummary(id: number | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<TimeSummarySnapshot>({
    queryKey: tk.timeSummary(id ?? 0),
    queryFn: async () => {
      const raw = await getTimeSummary(id as number);
      return {
        ...raw,
        total_seconds: typeof raw?.total_seconds === "number" ? raw.total_seconds : 0,
        active: raw?.active ?? null,
        by_column: Array.isArray(raw?.by_column) ? raw.by_column : [],
        fetched_at: Date.now(),
      };
    },
    enabled: options.enabled !== false && validId(id),
    retry: retryUnlessDenied,
    staleTime: 30_000,
  });
}

/** `Date.now()`, refreshed every `intervalMs` while `enabled`. */
export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(handle);
  }, [enabled, intervalMs]);
  return now;
}

/**
 * Refetch the timer and the time-in-status panel when the ticket changes
 * column. The server stops running timers on a move into a closed column
 * (E32) and broadcasts `ticket_activity{kind:'timer'}`, but that frame
 * carries the mover's mutation id, so the mover's own tab ignores it.
 *
 * A move is applied optimistically (the column changes before the server has
 * stopped anything), so a later save of a ticket that sits in a closed column
 * (a new `updated_at`) refetches again.
 */
export function useRefetchTimerOnColumnChange(
  ticketId: number,
  ticket: { columnId?: number | null; closed?: boolean; updatedAt?: string | null },
) {
  const qc = useQueryClient();
  const { columnId, closed, updatedAt } = ticket;
  const last = useRef<{ columnId?: number | null; updatedAt?: string | null }>({ columnId, updatedAt });
  useEffect(() => {
    if (columnId == null) return;
    const prev = last.current;
    const moved = prev.columnId != null && prev.columnId !== columnId;
    const savedWhileClosed = Boolean(closed) && prev.updatedAt != null && prev.updatedAt !== updatedAt;
    if (moved || savedWhileClosed) {
      qc.invalidateQueries({ queryKey: tk.timer(ticketId) });
      qc.invalidateQueries({ queryKey: tk.timerCurrent() });
      qc.invalidateQueries({ queryKey: tk.timeSummary(ticketId) });
    }
    last.current = { columnId, updatedAt };
  }, [qc, ticketId, columnId, closed, updatedAt]);
}

/** The 409 body of a timer write, if it is one. */
export function timerConflictOf(error: unknown): { code: string; running?: TimerConflict["running"] } | null {
  if (errorStatus(error) !== 409) return null;
  const data = (error as { response?: { data?: unknown } }).response?.data as
    | { code?: unknown; running?: TimerConflict["running"] }
    | undefined;
  if (!data || typeof data.code !== "string") return null;
  return { code: data.code, running: data.running ?? null };
}

function mid(): string {
  const id = newMutationId();
  rememberMutation(id);
  return id;
}

function invalidateTimer(qc: QueryClient, ticketId: number, otherTicketId?: number | null) {
  qc.invalidateQueries({ queryKey: tk.timer(ticketId) });
  qc.invalidateQueries({ queryKey: tk.timerCurrent() });
  if (otherTicketId && otherTicketId !== ticketId) {
    qc.invalidateQueries({ queryKey: tk.timer(otherTicketId) });
  }
}

/** Start / stop writes for one ticket. Errors are left to the caller. */
export function useTimerMutations(ticketId: number) {
  const qc = useQueryClient();

  const start = useMutation({
    mutationFn: (vars: { switch?: boolean; otherTicketId?: number | null } = {}) =>
      timerStart(ticketId, { switch: vars.switch }, mid()),
    onSuccess: (entry, vars) => {
      // Show it running at once; the refetch below replaces the totals.
      qc.setQueryData<TimerSnapshot>(tk.timer(ticketId), (prev) =>
        prev && !prev.running
          ? {
              ...prev,
              running: entry,
              entries: [entry, ...prev.entries.filter((e) => e.id !== entry.id)],
              // Treat the entry's start as "server now" at receipt (elapsed ≈ 0).
              server_now: entry.started_at,
              fetched_at: Date.now(),
            }
          : prev,
      );
      invalidateTimer(qc, ticketId, vars?.otherTicketId);
    },
  });

  const stop = useMutation({
    mutationFn: () => timerStop(ticketId, mid()),
    onSuccess: (entry) => {
      qc.setQueryData<TimerSnapshot>(tk.timer(ticketId), (prev) => {
        if (!prev || !prev.running) return prev;
        const totals = liveTotals(prev);
        return {
          ...prev,
          running: null,
          my_total_seconds: totals.mine,
          total_seconds: totals.total,
          entries: prev.entries.map((e) => (e.id === entry.id ? entry : e)),
          by_user: totals.byUser,
          server_now: new Date(serverNowMs(prev)).toISOString(),
          fetched_at: Date.now(),
        };
      });
      invalidateTimer(qc, ticketId);
    },
    onError: (error) => {
      // Already stopped elsewhere (another tab, a move into a closed column).
      if (timerConflictOf(error)?.code === "timer_not_running") invalidateTimer(qc, ticketId);
    },
  });

  return { start, stop };
}
