"use client";

/**
 * Board toolbar (44px, D34–D46, plan §3):
 * Board/List segment · Assignee, Priority, Label (and Due) chips · count ·
 * search · sort cycle · clear.
 *
 * Every value lives in the URL through `useTicketFilters` (E19).
 * - "List" is hidden while `flags.listViewEnabled` is false (DC3).
 * - The Due chip shows when `due` is set, or after "More filters" in the
 *   Assignee popover adds it (DC2); it stays until the filters are cleared.
 * - Below `sm` the chips scroll horizontally and search collapses to an icon.
 */
import { useEffect, useState } from "react";
import { ArrowUpDown, Calendar, FilterX, ListFilter, SignalHigh, Tag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useTicketFilters } from "../../_hooks/use-ticket-filters";
import { flags } from "../../_lib/flags";
import { getPriorityStyle, PRIORITY_OPTIONS } from "../../_lib/priority";
import type { DueFilter, TagRef } from "../../_lib/types";
import { PriorityIcon } from "../primitives/priority";
import { VDivider } from "../primitives/section-label";
import { ViewSegment } from "../primitives/view-segment";
import { FilterMenu, ITEM_HIGHLIGHT, type FilterOption } from "./filter-menu";
import { ToolbarSearch } from "./toolbar-search";

export const UNASSIGNED_OPTION = "__unassigned";
const DUE_OPTIONS: { value: DueFilter; key: "overdue" | "thisWeek" | "none" }[] = [
  { value: "overdue", key: "overdue" },
  { value: "week", key: "thisWeek" },
  { value: "none", key: "none" },
];

export interface ToolbarUser {
  id: number;
  name: string;
}

export interface TicketsToolbarProps {
  /** Tickets shown with the current filters; the count is hidden while null. */
  count: number | null;
  users: ToolbarUser[];
  tags: TagRef[];
  /** Overrides `flags.listViewEnabled` (tests, FE-INT). */
  listViewEnabled?: boolean;
  /** The board changed: forget a Due chip that was only added (not set). */
  boardId?: number | null;
}

export function TicketsToolbar({ count, users, tags, listViewEnabled = flags.listViewEnabled, boardId }: TicketsToolbarProps) {
  const t = useTranslations("ticketsScreen");
  const tTickets = useTranslations("tickets");
  const { filters, setFilter, setFilters, clear, hasActiveFilters, view, sort, cycleSort } = useTicketFilters();

  const [dueAdded, setDueAdded] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  useEffect(() => setDueAdded(false), [boardId]);
  const showDue = dueAdded || filters.due !== null;

  // Assignee: Me, the users, Unassigned (multi). "Unassigned" is its own URL flag.
  const assigneeOptions: FilterOption[] = [
    { value: "me", label: t("filters.me"), icon: <OptionIcon /> },
    ...users.map((u) => ({ value: String(u.id), label: u.name, avatarName: u.name })),
    { value: UNASSIGNED_OPTION, label: t("filters.unassigned"), icon: <OptionIcon dashed /> },
  ];
  const assigneeSelected = [...filters.assignee, ...(filters.unassigned ? [UNASSIGNED_OPTION] : [])];
  const onAssignee = (next: string[]) =>
    setFilters({
      assignee: next.filter((v) => v !== UNASSIGNED_OPTION),
      unassigned: next.includes(UNASSIGNED_OPTION),
    });

  const priorityOptions: FilterOption[] = PRIORITY_OPTIONS.map((p) => ({
    value: p,
    label: tTickets(getPriorityStyle(p).labelKey),
    icon: <PriorityIcon priority={p} size={14} />,
  }));

  const labelOptions: FilterOption[] = tags.map((tag) => ({ value: String(tag.id), label: tag.name, color: tag.color }));

  const dueOptions: FilterOption[] = DUE_OPTIONS.map((d) => ({ value: d.value, label: t(`due.${d.key}`) }));

  const onClear = () => {
    setDueAdded(false);
    clear();
  };

  const moreFilters = !showDue ? (
    <CommandItem
      value="__more-filters"
      onSelect={() => {
        setAssigneeOpen(false);
        setDueAdded(true);
        // Open the new chip once it has rendered.
        setTimeout(() => setDueOpen(true), 0);
      }}
      data-testid="more-filters"
      className={cn("h-[30px] cursor-pointer gap-2 px-2 text-[13px]", ITEM_HIGHLIGHT)}
    >
      <ListFilter aria-hidden="true" size={14} className="text-muted-foreground" />
      <span>{t("filters.moreFilters")}</span>
    </CommandItem>
  ) : undefined;

  const sortLabel = t(`sort.${sort}`);
  const common = { searchPlaceholder: t("filters.search"), emptyText: t("filters.noResults") };

  return (
    <div
      role="toolbar"
      aria-label={t("toolbar.label")}
      data-testid="tickets-toolbar"
      className="flex h-11 shrink-0 items-center gap-2 border-b px-3"
    >
      <div
        data-testid="toolbar-chips"
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ViewSegment
          value={view}
          onChange={(v) => setFilter("view", v)}
          labels={{ board: t("toolbar.board"), list: t("toolbar.list") }}
          hidden={listViewEnabled ? [] : ["list"]}
          ariaLabel={t("toolbar.view")}
        />
        <VDivider />
        <FilterMenu
          id="assignee"
          icon={UserRound}
          label={t("filters.assignee")}
          options={assigneeOptions}
          selected={assigneeSelected}
          onChange={onAssignee}
          footer={moreFilters}
          open={assigneeOpen}
          onOpenChange={setAssigneeOpen}
          {...common}
        />
        <FilterMenu
          id="priority"
          icon={SignalHigh}
          label={t("filters.priority")}
          options={priorityOptions}
          selected={filters.priority}
          onChange={(v) => setFilter("priority", v)}
          searchable={false}
          {...common}
        />
        <FilterMenu
          id="label"
          icon={Tag}
          label={t("filters.label")}
          options={labelOptions}
          selected={filters.label.map(String)}
          onChange={(v) => setFilter("label", v.map(Number))}
          {...common}
        />
        {showDue && (
          <FilterMenu
            id="due"
            icon={Calendar}
            label={t("filters.due")}
            options={dueOptions}
            selected={filters.due ? [filters.due] : []}
            onChange={(v) => setFilter("due", v[0] ?? null)}
            multi={false}
            searchable={false}
            open={dueOpen}
            onOpenChange={setDueOpen}
            {...common}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {count !== null && (
          <span data-testid="toolbar-count" className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground xl:inline">
            {t("toolbar.count", { count })}
          </span>
        )}
        <ToolbarSearch
          value={filters.q}
          onChange={(q) => setFilter("q", q)}
          placeholder={t("toolbar.search")}
          openLabel={t("toolbar.openSearch")}
          clearLabel={t("toolbar.clearSearch")}
        />
        <button
          type="button"
          onClick={cycleSort}
          aria-label={t("toolbar.sortLabel", { sort: sortLabel })}
          title={t("toolbar.sortLabel", { sort: sortLabel })}
          data-testid="toolbar-sort"
          data-sort={sort}
          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowUpDown aria-hidden="true" size={13} />
          <span className="hidden xl:inline">{sortLabel}</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          aria-label={t("toolbar.clear")}
          title={t("toolbar.clear")}
          data-testid="toolbar-clear"
          className={cn(
            "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
          )}
        >
          <FilterX aria-hidden="true" size={14} />
        </button>
      </div>
    </div>
  );
}

/** 18px round icon for the Me / Unassigned options, aligned with the user avatars. */
function OptionIcon({ dashed = false }: { dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-full text-muted-foreground",
        dashed ? "border border-dashed border-muted-foreground/50" : "bg-muted",
      )}
    >
      <UserRound size={11} />
    </span>
  );
}
