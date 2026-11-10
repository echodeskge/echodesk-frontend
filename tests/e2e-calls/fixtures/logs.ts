/**
 * Call-log assertions through the local API (admin token): the browser is
 * what writes the rows, so every flow is checked server-side as well.
 */
import { expect } from "@playwright/test";
import { api } from "./session";

/** Subset of `CallLog` (src/api/generated/interfaces.ts) the specs read. */
export interface CallLogRow {
  id: number;
  call_id: string;
  sip_call_id?: string | null;
  pbx_call_id?: string | null;
  caller_number: string;
  recipient_number: string;
  direction?: "inbound" | "outbound";
  status?: string;
  started_at: string;
  answered_at?: string | null;
  ended_at?: string | null;
  duration?: string | null;
  handled_by?: number | null;
  transferred_to?: string | null;
  transferred_to_user?: number | null;
  transfer_type?: string | null;
  parent_call?: number | null;
  recording_url?: string | null;
}

interface Page<T> {
  count: number;
  results: T[];
}

/** Final statuses: the browser wrote its last update for the leg. */
export const FINAL_STATUSES = ["ended", "missed", "no_answer", "busy", "failed", "cancelled", "transferred"];

/** A moment just before the test started: rows older than this are ignored. */
export function mark(): Date {
  return new Date(Date.now() - 2_000);
}

/** Every row started at or after `since`, newest first (page_size cap 100). */
export async function logsSince(since: Date): Promise<CallLogRow[]> {
  const q = new URLSearchParams({ started_after: since.toISOString(), ordering: "-started_at", page_size: "100" });
  const page = await api<Page<CallLogRow>>("GET", `/api/call-logs/?${q.toString()}`);
  return page.results ?? [];
}

/**
 * Polls `logsSince(since)` until `pick` returns a non-empty list (<= timeout)
 * and returns that list; fails with the rows seen last otherwise.
 */
export async function waitForLogs(
  since: Date,
  pick: (rows: CallLogRow[]) => CallLogRow[],
  { timeout = 15_000, label = "call logs" } = {},
): Promise<CallLogRow[]> {
  let last: CallLogRow[] = [];
  await expect
    .poll(
      async () => {
        last = await logsSince(since);
        return pick(last).length > 0;
      },
      { timeout, intervals: [500, 1000], message: `waiting for ${label}; last rows: ${summarise(last)}` },
    )
    .toBe(true);
  return pick(last);
}

/** Rows a given user wrote (`handled_by`). */
export const byUser = (rows: CallLogRow[], userId: number) => rows.filter((r) => r.handled_by === userId);

export const withStatus = (rows: CallLogRow[], statuses: string[]) => rows.filter((r) => statuses.includes(r.status ?? ""));

/** No `sip_call_id` appears twice (dedupe contract of `log_incoming_call`). */
export function expectOneRowPerSipCallId(rows: CallLogRow[]) {
  const seen = new Map<string, number>();
  for (const r of rows) {
    if (!r.sip_call_id) continue;
    seen.set(r.sip_call_id, (seen.get(r.sip_call_id) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
  expect(dupes, `duplicate sip_call_id rows: ${summarise(rows)}`).toEqual([]);
  // The browser must send the SIP Call-ID with every leg it logs.
  expect(rows.filter((r) => !r.sip_call_id), `rows without sip_call_id: ${summarise(rows)}`).toEqual([]);
}

export function summarise(rows: CallLogRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      dir: r.direction,
      from: r.caller_number,
      to: r.recipient_number,
      status: r.status,
      by: r.handled_by,
      sip: r.sip_call_id ? `${r.sip_call_id.slice(0, 8)}…` : null,
      pbx: r.pbx_call_id ?? null,
      rec: !!r.recording_url,
    })),
  );
}
