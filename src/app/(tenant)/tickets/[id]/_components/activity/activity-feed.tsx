"use client";

/**
 * Activity feed (plan FE-11; design B feed, D151–D165).
 *
 * - Header: "Activity", the All / Comments / History / Time segment with
 *   counts (Time = the number of time entries, DC33) and "Updated
 *   {relative}" from `ticket.updated_at`, re-rendered every 60s.
 * - Timeline (2px left rail): history events and comment bubbles, oldest
 *   first, from `/activity/` (A9). The Time tab renders FE-13's `<TimeTab/>`.
 * - Edit / delete: the author, or staff, may change a comment (A8).
 * - Freshness: the shell's `use-detail-realtime` refetches `tk.activity` on
 *   `ticket_commented` / `ticket_activity`; nothing subscribes here.
 * - Scrolling: the feed sits under the description in one scrolling pane, so
 *   opening a ticket doesn't jump to the bottom. The first load scrolls only
 *   to a `#comment-{id}` / `#activity` hash; a comment this tab posts is
 *   scrolled into view once it arrives.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { TimeTab } from "../../../_components/timer/time-tab";
import { initials } from "../../../_components/primitives/initials";
import { useTicket, useTicketActivity } from "../../../_hooks/use-ticket";
import { useTicketTimer } from "../../../_hooks/use-ticket-timer";
import { useTicketPermissions } from "../../../_hooks/use-ticket-permissions";
import { useTicketPickers } from "../../../_hooks/use-ticket-pickers";
import { formatRelative } from "../../../_lib/format";
import type { HistoryLabels } from "../history-dialog";
import type { ActivityFeedProps } from "../section-contracts";
import { useBoardColumns } from "../status-track-bar";
import {
  activityUserName,
  eventParts,
  feedCounts,
  isComment,
  itemsForTab,
  type EventLookups,
  type FeedTab,
} from "./activity-format";
import { CommentRow, EventRow } from "./activity-rows";
import { COMMENT_POSTED_EVENT, useCommentMutations, type CommentPostedDetail } from "./use-comment-mutations";

type Translate = HistoryLabels["t"];

const TABS: FeedTab[] = ["all", "comments", "history", "time"];
const TAB_KEYS: Record<FeedTab, string> = { all: "all", comments: "comments", history: "history", time: "time" };

/** The current time, refreshed every `intervalMs` (the "Updated …" label, DC33). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The ticket's timer state (A14), through FE-13's `useTicketTimer`. It must
 * share that query function: `tk.timer(id)` holds a normalized snapshot with
 * `fetched_at`, and a raw payload cached under the same key made every live
 * timer value NaN (the header read 00:00:00 after a reload).
 */
export function useTimerEntriesCount(ticketId: number): number {
  const q = useTicketTimer(ticketId);
  const entries = q.data?.entries;
  return Array.isArray(entries) ? entries.length : 0;
}

function scrollToHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.slice(1);
  if (!/^(activity|comment-\d+)$/.test(hash)) return false;
  const el = document.getElementById(hash);
  if (!el) return false;
  el.scrollIntoView?.({ block: "start" });
  return true;
}

export function ActivityFeed({ ticketId }: ActivityFeedProps) {
  const t = useTranslations("ticketsScreen.activity");
  const tTickets = useTranslations("tickets");
  const locale = useLocale();
  const now = useNow();
  const [tab, setTab] = useState<FeedTab>("all");

  const ticket = useTicket(ticketId).data;
  const boardId = ticket?.board?.id ?? ticket?.column?.board ?? null;
  const activity = useTicketActivity(ticketId);
  const timeCount = useTimerEntriesCount(ticketId);
  const columns = useBoardColumns(boardId);
  const pickers = useTicketPickers(boardId);
  const { data: profile } = useUserProfile();
  const { isStaff } = useTicketPermissions();
  const mutations = useCommentMutations(ticketId, boardId);

  const items = useMemo(() => (Array.isArray(activity.data) ? activity.data : []), [activity.data]);
  const counts = feedCounts(items, timeCount);
  const visible = itemsForTab(items, tab);

  const lookups = useMemo<EventLookups>(() => {
    const users = new Map<string, string>();
    for (const u of pickers.users) {
      const name = u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
      users.set(String(u.id), name);
    }
    return {
      columns: new Map((columns.data ?? []).map((c) => [String(c.id), c.name])),
      users,
      departments: new Map(pickers.departments.map((d) => [String(d.id), d.name])),
    };
  }, [columns.data, pickers.users, pickers.departments]);

  const mentionNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of pickers.users) {
      const name = u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
      if (u.email && name) m.set(u.email.toLowerCase(), name);
    }
    return m;
  }, [pickers.users]);

  const labels: HistoryLabels = { t: t as unknown as Translate, tTickets: tTickets as unknown as Translate, locale };

  // First load: honour a #comment-{id} / #activity hash once.
  const firstLoad = useRef(true);
  useEffect(() => {
    if (!activity.data || !firstLoad.current) return;
    firstLoad.current = false;
    const frame = requestAnimationFrame(() => scrollToHash());
    return () => cancelAnimationFrame(frame);
  }, [activity.data]);

  // A comment this tab posted: scroll it into view when it shows up.
  const pendingScroll = useRef<number | null>(null);
  useEffect(() => {
    const onPosted = (e: Event) => {
      const detail = (e as CustomEvent<CommentPostedDetail>).detail;
      if (detail?.ticketId !== ticketId) return;
      pendingScroll.current = detail.commentId;
      setTab((cur) => (cur === "history" || cur === "time" ? "all" : cur));
    };
    window.addEventListener(COMMENT_POSTED_EVENT, onPosted);
    return () => window.removeEventListener(COMMENT_POSTED_EVENT, onPosted);
  }, [ticketId]);
  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    const el = document.getElementById(`comment-${id}`);
    if (el) {
      pendingScroll.current = null;
      el.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [items, tab]);

  const updatedAt = ticket?.updated_at;

  return (
    <section id="activity" data-slot="activity-feed" data-ticket-id={ticketId} className="flex scroll-mt-4 flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-semibold leading-5">{t("title")}</h2>
        <div
          role="tablist"
          aria-label={t("title")}
          data-slot="feed-tabs"
          className="ml-1 inline-flex h-[26px] gap-0.5 rounded-md bg-muted p-0.5"
        >
          {TABS.map((key) => {
            const active = tab === key;
            const count = counts[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`feed-tab-${key}`}
                aria-selected={active}
                aria-controls="feed-panel"
                data-slot="feed-tab"
                data-tab={key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex items-center gap-[5px] rounded px-[9px] text-[11px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(TAB_KEYS[key])}
                {count > 0 && <span className="tabular-nums text-muted-foreground">{count}</span>}
              </button>
            );
          })}
        </div>
        {updatedAt && (
          <span data-slot="feed-updated" className="ml-auto text-[11px] leading-5 text-muted-foreground">
            {t("updated", { time: formatRelative(updatedAt, locale, now) })}
          </span>
        )}
      </div>

      <div id="feed-panel" role="tabpanel" aria-labelledby={`feed-tab-${tab}`}>
        {tab === "time" ? (
          <TimeTab ticketId={ticketId} />
        ) : activity.isLoading ? (
          <div className="ml-3 flex flex-col gap-2 border-l-2 border-border py-1 pl-4" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div data-slot="feed-empty" className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
            <MessageSquare aria-hidden="true" size={14} />
            {tab === "comments" ? t("noComments") : tab === "history" ? t("noHistory") : t("empty")}
          </div>
        ) : (
          <ol data-slot="feed-timeline" className="ml-3 flex flex-col gap-0.5 border-l-2 border-border pl-1">
            {visible.map((item) => {
              if (isComment(item)) {
                const own = profile?.id != null && item.user?.id === profile.id;
                return (
                  <CommentRow
                    key={item.id}
                    item={item}
                    now={now}
                    names={mentionNames}
                    canModify={own || isStaff}
                    saving={mutations.updateComment.isPending}
                    deleting={mutations.deleteComment.isPending}
                    onSave={(text) => mutations.updateComment.mutateAsync({ id: item.comment_id, comment: text })}
                    onDelete={() => mutations.deleteComment.mutateAsync({ id: item.comment_id })}
                  />
                );
              }
              const name = activityUserName(item.user, { system: t("system"), deleted: t("deletedUser") });
              return (
                <EventRow
                  key={item.id}
                  action={item.action}
                  parts={eventParts(item, labels, lookups)}
                  userInitials={item.user?.initials || initials(name)}
                  createdAt={item.created_at}
                  now={now}
                />
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
