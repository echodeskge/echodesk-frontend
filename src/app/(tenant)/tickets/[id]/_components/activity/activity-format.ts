/**
 * Pure helpers for the activity feed (plan FE-11).
 *
 * - `eventParts`: one `/activity/` history row → the translated sentence
 *   (the shared `historySentence` keys, `ticketsScreen.activity.events.*`),
 *   split around the actor's name so the row can bold it ("**who** action").
 *   Values that the backend stores as ids (column, assignee, department) are
 *   resolved to names, and HTML is stripped from every value (W70).
 * - `splitMentions`: comment text → text and `@email` mention segments.
 */
import { historySentence, type HistoryLabels } from "../history-dialog";
import type { ActivityComment, ActivityEvent, ActivityItem, HistoryEntry } from "../../../_lib/types";

/** Name lookups for history values that are stored as ids. */
export interface EventLookups {
  columns: Map<string, string>;
  users: Map<string, string>;
  departments: Map<string, string>;
}

export const EMPTY_LOOKUPS: EventLookups = { columns: new Map(), users: new Map(), departments: new Map() };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/** Plain text of an HTML (or plain) value, whitespace collapsed, at most `max` characters. */
export function stripHtml(value: string | null | undefined, max = 80): string {
  const text = String(value ?? "")
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_m, e: string) => ENTITIES[e] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Fields whose values are ids, and the lookup that names them. */
const ID_FIELDS: Record<string, keyof EventLookups> = {
  column_id: "columns",
  column: "columns",
  assigned_to_id: "users",
  assigned_to: "users",
  assigned_department_id: "departments",
  department: "departments",
};

/** Fields whose values are too long to quote (the sentence drops them). */
const NO_VALUE_FIELDS: ReadonlySet<string> = new Set(["description", "rich_description"]);

/** The backend's field names → the `activity.fields.*` keys. */
const FIELD_ALIASES: Record<string, string> = {
  column_id: "column",
  assigned_to_id: "assigned_to",
  assigned_department_id: "department",
};

function resolve(raw: string | null, field: string, lookups: EventLookups): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const kind = ID_FIELDS[field];
  if (kind && /^\d+$/.test(value)) return lookups[kind].get(value) ?? "—";
  return stripHtml(value);
}

/**
 * A `/history/` row with its id values (column, assignee, department) named,
 * for the History & transfers dialog (same rules as the feed).
 */
export function resolveHistoryEntry(entry: HistoryEntry, lookups: EventLookups): HistoryEntry {
  const field = entry.field_name || "";
  if (!ID_FIELDS[field]) return entry;
  return {
    ...entry,
    field_name: FIELD_ALIASES[field] ?? field,
    old_value: resolve(entry.old_value, field, lookups),
    new_value: resolve(entry.new_value, field, lookups),
  };
}

/** Marks where the actor's name sits in the translated sentence. */
const NAME_MARK = "⁣⁣";

export interface EventParts {
  before: string;
  name: string;
  after: string;
}

/** Display name of an activity user; null id = the system. */
export function activityUserName(user: ActivityItem["user"] | null | undefined, labels: { system: string; deleted: string }): string {
  if (!user || user.id === null || user.id === undefined) return labels.system;
  return (user.name ?? "").trim() || (user.email ?? "").trim() || labels.deleted;
}

export function eventParts(
  event: ActivityEvent,
  labels: HistoryLabels,
  lookups: EventLookups = EMPTY_LOOKUPS,
): EventParts {
  const t = labels.t;
  const name = activityUserName(event.user, { system: t("system"), deleted: t("deletedUser") });
  const field = event.field_name || "";
  const dropValues = NO_VALUE_FIELDS.has(field);
  // `assigned` on assigned_to_id with no new value is an unassignment.
  const action =
    event.action === "assigned" && ID_FIELDS[field] === "users" && !(event.new_value ?? "").trim()
      ? "unassigned"
      : event.action;
  const entry: HistoryEntry = {
    id: 0,
    ticket: 0,
    action,
    field_name: FIELD_ALIASES[field] ?? field,
    old_value: dropValues ? "" : resolve(event.old_value, field, lookups),
    new_value: dropValues ? "" : resolve(event.new_value, field, lookups),
    description: event.description,
    // `historySentence` reads the name from `full_name`; the mark stands in
    // for it so the name can be rendered separately.
    user: { id: 1, email: "", first_name: "", last_name: "", full_name: NAME_MARK } as unknown as HistoryEntry["user"],
    created_at: event.created_at,
  };
  const sentence = historySentence(entry, labels);
  const at = sentence.indexOf(NAME_MARK);
  if (at === -1) return { before: "", name, after: ` ${sentence}` };
  let after = sentence.slice(at + NAME_MARK.length);
  let shown = name;
  // Georgian marks the subject with "{name}-მა". For the system actor
  // ("სისტემა") the correct form is the joined "სისტემამ", not "სისტემა-მა".
  if (isSystemUser(event.user) && shown.endsWith("ა") && after.startsWith("-მა")) {
    shown = `${shown}მ`;
    after = after.slice(3);
  }
  return { before: sentence.slice(0, at), name: shown, after };
}

function isSystemUser(user: ActivityItem["user"] | null | undefined): boolean {
  return !user || user.id === null || user.id === undefined;
}

export function eventText(event: ActivityEvent, labels: HistoryLabels, lookups?: EventLookups): string {
  const p = eventParts(event, labels, lookups);
  return `${p.before}${p.name}${p.after}`;
}

// ---------------------------------------------------------------------------
// Mentions
// ---------------------------------------------------------------------------

export type CommentSegment = { type: "text"; text: string } | { type: "mention"; email: string };

/** `@name@domain.tld`; a trailing "." or "," stays outside the mention. */
const MENTION = /(^|[^\w@])@([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;

export function splitMentions(text: string): CommentSegment[] {
  const out: CommentSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const start = (m.index ?? 0) + m[1].length;
    if (start > last) out.push({ type: "text", text: text.slice(last, start) });
    out.push({ type: "mention", email: m[2] });
    last = start + 1 + m[2].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export type FeedTab = "all" | "comments" | "history" | "time";

export function isComment(item: ActivityItem): item is ActivityComment {
  return item.type === "comment";
}

export function feedCounts(items: ActivityItem[], timeEntries: number) {
  const comments = items.filter(isComment).length;
  return { all: items.length, comments, history: items.length - comments, time: timeEntries };
}

export function itemsForTab(items: ActivityItem[], tab: FeedTab): ActivityItem[] {
  if (tab === "comments") return items.filter(isComment);
  if (tab === "history") return items.filter((i) => !isComment(i));
  if (tab === "time") return [];
  return items;
}
