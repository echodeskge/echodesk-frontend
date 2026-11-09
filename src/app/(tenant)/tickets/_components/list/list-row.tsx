"use client";

/**
 * One list row (plan §3 List, FE-08).
 *
 * Desktop (md and up): a 40px row on the list grid
 *   priority icon · mono #id · title (ellipsis) · 20px label chips ·
 *   22px avatars or the dashed unassigned circle · comment count · created date.
 * Below @3xl: two lines, priority icon, #id, title / label chips, avatars, date
 * (no header, DC18).
 *
 * One DOM for both: the two line wrappers are flex rows on mobile and
 * `display: contents` on desktop, so their children become the grid cells.
 *
 * The row is a real link to `/tickets/<id>?<filters>` (middle click, ctrl/cmd
 * click and "open in new tab" work); a plain click goes through the router.
 */
import { memo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarStack, LabelChips, PriorityIcon } from "../primitives";
import { ticketHref } from "../board/ticket-card";
import { formatShortDate } from "../../_lib/format";
import type { TicketListRow } from "../../_lib/types";

/**
 * The list grid (design B: `36px 64px minmax(0,1fr) 200px 90px 56px 90px`).
 * Kept as one literal so Tailwind sees it; shared by the header and the rows.
 */
export const LIST_GRID_CLASS = "@3xl:grid-cols-[36px_64px_minmax(0,1fr)_200px_90px_56px_90px]";
export const LIST_GRID_TEMPLATE = "36px 64px minmax(0,1fr) 200px 90px 56px 90px";

type ListUser = { id: number; email?: string | null; first_name?: string | null; last_name?: string | null };

function displayName(u: ListUser): string {
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "";
}

/** `assigned_to` first, then the other assignees, without duplicates. */
export function rowAssignees(row: Pick<TicketListRow, "assigned_to" | "assigned_users">): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  const seen = new Set<number>();
  for (const u of [row.assigned_to, ...(row.assigned_users ?? [])] as (ListUser | null | undefined)[]) {
    if (!u || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push({ id: u.id, name: displayName(u) });
  }
  return out;
}

export interface ListRowProps {
  row: TicketListRow;
  /** Query string (no "?") carried to the detail URL so back and J/K keep the list order. */
  query?: string;
}

export const ListRow = memo(function ListRow({ row, query }: ListRowProps) {
  const t = useTranslations("ticketsScreen");
  const locale = useLocale();
  const router = useRouter();
  const href = ticketHref(row.id, query);
  const comments = row.comments_count ?? 0;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href);
  };

  return (
    <a
      href={href}
      onClick={onClick}
      data-testid="list-row"
      data-ticket-id={row.id}
      data-column-id={row.column?.id}
      className={cn(
        "flex flex-col gap-1 border-b px-4 py-2 text-[13px] text-foreground outline-none transition-colors",
        "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
        "@3xl:grid @3xl:h-10 @3xl:items-center @3xl:gap-0 @3xl:py-0",
        LIST_GRID_CLASS,
      )}
    >
      {/* line 1 on mobile; cells 1–3 on desktop */}
      <span className="flex min-w-0 items-center gap-2 @3xl:contents" data-slot="list-row-main">
        <PriorityIcon priority={row.priority} size={15} />
        <span className="shrink-0 font-mono text-xs text-muted-foreground @3xl:shrink">#{row.id}</span>
        <span className="min-w-0 flex-1 truncate font-medium @3xl:pr-4" data-testid="list-row-title">
          {row.title}
        </span>
      </span>

      {/* line 2 on mobile; cells 4–7 on desktop */}
      <span className="flex min-w-0 items-center gap-2 @3xl:contents" data-slot="list-row-meta">
        <span className="flex min-w-0 gap-1 overflow-hidden" data-testid="list-row-labels">
          <LabelChips labels={row.tags ?? []} max={3} size="list" />
        </span>
        <span className="flex shrink-0">
          <AvatarStack
            users={rowAssignees(row)}
            size={22}
            max={3}
            ringColor="background"
            emptyLabel={t("card.unassigned")}
          />
        </span>
        <span
          className="hidden items-center justify-end gap-1 text-xs tabular-nums text-muted-foreground @3xl:inline-flex"
          data-testid="list-row-comments"
          title={t("card.comments", { count: comments })}
        >
          <MessageCircle aria-hidden="true" size={12} />
          <span aria-hidden="true">{comments}</span>
          <span className="sr-only">{t("card.comments", { count: comments })}</span>
        </span>
        <span
          className="ml-auto shrink-0 text-right text-xs tabular-nums text-muted-foreground @3xl:ml-0"
          data-testid="list-row-date"
        >
          {formatShortDate(row.created_at, locale)}
        </span>
      </span>
    </a>
  );
});
