"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Archive, CheckCheck, History, MoreVertical, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAllAsRead, useArchiveAllConversations } from "@/hooks/api/useSocial";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

import { PLATFORM_BG, PLATFORM_BRAND, PLATFORM_ICON } from "../platform-visuals";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { AssignmentTab, BetaPlatform } from "../store/types";

interface Props {
  /** Platforms this page renders; drives the channel chips. */
  platforms: BetaPlatform[];
  /** Tab strip (All / Assigned to me) — only when assignment mode is on. */
  showTabs: boolean;
  assignedCount: number;
}

const PLATFORM_ORDER: BetaPlatform[] = ["facebook", "instagram", "whatsapp", "widget", "email", "telegram"];

const SEARCH_DEBOUNCE_MS = 300;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/**
 * Conversation-list toolbar (design): row 1 = segmented tabs (or, without
 * assignment mode, the channel chips) + History toggle (+ admin bulk menu);
 * row 2 = search (+ channel chips when the tabs take row 1); then the amber
 * "Viewing history" banner while History is on.
 */
export function MessagesBetaSidebarHeader({ platforms, showTabs, assignedCount }: Props) {
  const t = useTranslations("messagesBeta.sidebar");
  const tPlatforms = useTranslations("messagesBeta.platforms");
  const { data: userProfile } = useUserProfile();
  const isAdmin = userProfile?.is_staff === true;

  const searchQuery = useMessagesBetaStore((s) => s.searchQuery);
  const platformFilter = useMessagesBetaStore((s) => s.platformFilter);
  const showArchived = useMessagesBetaStore((s) => s.showArchived);
  const assignmentTab = useMessagesBetaStore((s) => s.assignmentTab);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);
  const setSearchQuery = useMessagesBetaStore((s) => s.setSearchQuery);
  const setPlatformFilter = useMessagesBetaStore((s) => s.setPlatformFilter);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const selectChat = useMessagesBetaStore((s) => s.selectChat);

  // Local input (immediate) → store (debounced): the list selectors read the
  // store, so this keeps filtering cheap on big tenants.
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearchQuery]);
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const markAllAsReadMutation = useMarkAllAsRead();
  const archiveAllMutation = useArchiveAllConversations();

  const chips = useMemo(() => PLATFORM_ORDER.filter((p) => platforms.includes(p)), [platforms]);
  const targetPlatformsCsv = platforms.filter((p) => p !== "email").join(",");

  const handleToggleHistory = () => {
    // The open chat is probably not in the other view; a stale selection
    // would render "not found".
    selectChat(null);
    setShowArchived(!showArchived);
  };

  const handleChip = (value: BetaPlatform) => {
    setPlatformFilter(platformFilter === value ? null : value);
    selectChat(null);
  };

  const platformLabel = (p: BetaPlatform) => PLATFORM_BRAND[p] ?? tPlatforms("widget");

  const tabs: Array<{ value: AssignmentTab; label: string; count?: number }> = [
    { value: "all", label: t("tabAll") },
    { value: "assigned", label: t("tabAssigned"), count: assignedCount },
  ];

  const tabsVisible = showTabs && !showArchived;
  const chipsEl =
    chips.length > 1 ? (
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={t("filterByPlatform")}>
        {chips.map((p) => {
          const Icon = PLATFORM_ICON[p];
          const active = platformFilter === p;
          const dimmed = platformFilter !== null && !active;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handleChip(p)}
              aria-pressed={active}
              aria-label={t("filterChannel", { channel: platformLabel(p) })}
              title={platformLabel(p)}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition-opacity hover:opacity-100",
                PLATFORM_BG[p],
                dimmed && "opacity-40",
                active && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background"
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={2.25} />
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="flex shrink-0 flex-col border-b">
      <div className="flex flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {tabsVisible ? (
            <div
              role="tablist"
              aria-label={t("tabAll")}
              className="flex h-7 flex-1 items-center rounded-md bg-muted p-0.5"
            >
              {tabs.map((tab) => {
                const active = assignmentTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setAssignmentTab(tab.value)}
                    className={cn(
                      "inline-flex h-6 min-w-0 flex-1 items-center justify-center gap-1 rounded px-2 text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{tab.label}</span>
                    {tab.count ? <span className="tabular-nums text-muted-foreground">{tab.count}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center">{chipsEl}</div>
          )}

          <button
            type="button"
            onClick={handleToggleHistory}
            className={cn(iconBtn, showArchived && "bg-muted text-foreground")}
            aria-pressed={showArchived}
            aria-label={showArchived ? t("backToChats") : t("viewHistory")}
            title={showArchived ? t("backToChats") : t("viewHistory")}
          >
            <History className="h-[15px] w-[15px]" />
          </button>

          {isAdmin && !showArchived && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={iconBtn} aria-label={t("moreActions")}>
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  onClick={() =>
                    !markAllAsReadMutation.isPending && markAllAsReadMutation.mutate(targetPlatformsCsv || "all")
                  }
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  {t("markAllAsRead")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    !archiveAllMutation.isPending && archiveAllMutation.mutate(targetPlatformsCsv || "all")
                  }
                  disabled={archiveAllMutation.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {t("archiveAll")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-7 w-full rounded-md border border-input bg-background pl-[26px] pr-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label={t("clearSearch")}
                className="absolute right-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {tabsVisible && chipsEl}
        </div>
      </div>

      {showArchived && (
        <div className="flex h-8 items-center gap-1.5 border-t bg-[#f59e0b14] px-3 text-xs font-medium text-[#b45309] dark:text-amber-300">
          <History className="h-3.5 w-3.5" />
          <span className="truncate">{t("viewingHistory")}</span>
          <button
            type="button"
            onClick={handleToggleHistory}
            className="ml-auto inline-flex items-center gap-1 rounded px-1 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("back")}
          </button>
        </div>
      )}
    </div>
  );
}
