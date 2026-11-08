import { format, isSameDay, startOfDay, subDays } from "date-fns";
import { callInitials, isMissedStatus } from "@/components/calls/call-format";

export { isMissedStatus, statusLabelKey } from "@/components/calls/call-format";

/** A row of GET /api/call-logs/ as the Calls screen reads it. */
export interface CallLogRow {
  id: number;
  call_id?: string;
  caller_number: string;
  recipient_number: string;
  direction: "inbound" | "outbound";
  status: string;
  started_at: string;
  answered_at?: string | null;
  ended_at?: string | null;
  duration: string | null;
  duration_display?: string | null;
  handled_by?: number | null;
  handled_by_name: string | null;
  call_quality_score: number | null;
  notes: string;
  recording_url: string;
  transferred_to: string;
  transferred_to_user_name: string | null;
  client_name: string | null;
}

export type CallTab = "all" | "missed" | "incoming" | "outgoing";
export const CALL_TABS: CallTab[] = ["all", "missed", "incoming", "outgoing"];

export const CALLS_PAGE_SIZE = 25;

/** API filters for a tab (Missed covers missed + no_answer). */
export function tabParams(tab: CallTab): Record<string, string> {
  switch (tab) {
    case "missed":
      return { status__in: "missed,no_answer" };
    case "incoming":
      return { direction: "inbound" };
    case "outgoing":
      return { direction: "outbound" };
    default:
      return {};
  }
}

/**
 * Search text as sent to the API: trimmed, and with whitespace removed when
 * it looks like a phone number ("+995 555 12" matches "+99555512...").
 */
export function searchParam(input: string): string {
  const trimmed = input.trim();
  if (/^[+\d\s()-]+$/.test(trimmed)) return trimmed.replace(/[\s()-]/g, "");
  return trimmed;
}

/** The other party's number. */
export function callNumber(log: Pick<CallLogRow, "direction" | "caller_number" | "recipient_number">): string {
  return log.direction === "inbound" ? log.caller_number : log.recipient_number;
}

/** DRF DurationField ("00:01:05", "1 02:00:00", "65.0") -> seconds. */
export function durationSeconds(value: string | null | undefined): number {
  if (!value) return 0;
  const str = String(value).trim();
  const dayMatch = str.match(/^(\d+)\s+(.*)$/);
  const days = dayMatch ? Number(dayMatch[1]) : 0;
  const rest = dayMatch ? dayMatch[2] : str;
  const parts = rest.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  let secs = 0;
  for (const p of parts) secs = secs * 60 + p;
  return Math.max(0, Math.floor(days * 86400 + secs));
}

export type DayBucket = { key: string; kind: "today" | "yesterday" | "date"; date: Date; items: CallLogRow[] };

/** Groups rows (already newest first) into day buckets. */
export function groupByDay(logs: CallLogRow[], now: Date = new Date()): DayBucket[] {
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const buckets: DayBucket[] = [];
  for (const log of logs) {
    const date = new Date(log.started_at);
    const key = format(date, "yyyy-MM-dd");
    let bucket = buckets[buckets.length - 1];
    if (!bucket || bucket.key !== key) {
      const kind = isSameDay(date, today) ? "today" : isSameDay(date, yesterday) ? "yesterday" : "date";
      bucket = { key, kind, date: startOfDay(date), items: [] };
      buckets.push(bucket);
    }
    bucket.items.push(log);
  }
  return buckets;
}

/** Today's totals: calls, missed, average duration of answered calls. */
export function todaySummary(logs: CallLogRow[], now: Date = new Date()): { total: number; missed: number; avgSeconds: number } {
  const todays = logs.filter((l) => isSameDay(new Date(l.started_at), now));
  const answered = todays.filter((l) => !isMissedStatus(l.status) && (l.answered_at || durationSeconds(l.duration) > 0));
  const totalSecs = answered.reduce((sum, l) => sum + durationSeconds(l.duration), 0);
  return {
    total: todays.length,
    missed: todays.filter((l) => isMissedStatus(l.status)).length,
    avgSeconds: answered.length ? Math.round(totalSecs / answered.length) : 0,
  };
}

export const agentInitials = callInitials;

export interface AgentOption {
  id: number;
  name: string;
}

/** Unique agents (user id + name) from phone assignments. */
export function agentsFromAssignments(
  rows: Array<{ user?: number | null; user_name?: string | null; extension?: string }>,
  /** Name for a user without one, from the extension (translated by the caller). */
  extLabel: (ext: string) => string = (ext) => `Ext ${ext}`.trim()
): AgentOption[] {
  const seen = new Map<number, AgentOption>();
  for (const row of rows) {
    if (row.user == null || seen.has(row.user)) continue;
    seen.set(row.user, { id: row.user, name: row.user_name || extLabel(row.extension ?? "") });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
