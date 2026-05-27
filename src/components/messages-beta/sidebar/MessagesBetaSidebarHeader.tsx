"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Archive,
  CheckCheck,
  Facebook,
  Filter,
  History,
  Instagram,
  Mail,
  MessageCircle,
  MoreVertical,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMarkAllAsRead, useArchiveAllConversations } from "@/hooks/api/useSocial";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { BetaPlatform } from "../store/types";

interface Props {
  /** Platforms that this page renders (e.g. social = ['facebook','instagram','whatsapp','widget']). Drives which entries the platform-filter dropdown lists. */
  platforms: BetaPlatform[];
}

// Labels: brand names (Messenger / Instagram / WhatsApp / Email) are proper
// nouns and stay untranslated; "widget" is the one descriptive label that
// gets translated via `tPlatforms` below.
const PLATFORM_OPTIONS: Array<{ value: BetaPlatform; label: string; icon: typeof Facebook }> = [
  { value: "facebook", label: "Messenger", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "widget", label: "", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
];

const SEARCH_DEBOUNCE_MS = 300;

export function MessagesBetaSidebarHeader({ platforms }: Props) {
  const t = useTranslations("messagesBeta.sidebar");
  const tPlatforms = useTranslations("messagesBeta.platforms");
  const { data: userProfile } = useUserProfile();
  const isAdmin = userProfile?.is_staff === true;

  const searchQuery = useMessagesBetaStore((s) => s.searchQuery);
  const platformFilter = useMessagesBetaStore((s) => s.platformFilter);
  const showArchived = useMessagesBetaStore((s) => s.showArchived);
  const setSearchQuery = useMessagesBetaStore((s) => s.setSearchQuery);
  const setPlatformFilter = useMessagesBetaStore((s) => s.setPlatformFilter);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const selectChat = useMessagesBetaStore((s) => s.selectChat);

  // Local input state (immediate) → store (debounced). The selectors that
  // filter the sidebar list read from the store, so debouncing here avoids
  // re-running the filter on every keystroke for tenants with thousands of
  // conversations.
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearchQuery]);

  // Keep input in sync when store changes externally (URL hydration, future PRs).
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const markAllAsReadMutation = useMarkAllAsRead();
  const archiveAllMutation = useArchiveAllConversations();

  // Filter the platform options to only what this page actually supports.
  const platformChoices = useMemo(
    () => PLATFORM_OPTIONS.filter((opt) => platforms.includes(opt.value)),
    [platforms]
  );

  // Email-only pages (the legacy /email path) treat "mark all read" as
  // "archive all" since email doesn't have a separate read state UX.
  // /messages-beta is social-only for now (per the parity plan) so we always
  // mark-all-read against the social platforms.
  const targetPlatformsCsv = platforms.filter((p) => p !== "email").join(",");

  const handleToggleHistory = () => {
    // When entering / leaving history we drop the current selection — the
    // chat probably isn't visible in the new view and a stale URL chatId
    // would render "not found".
    selectChat(null);
    setShowArchived(!showArchived);
  };

  const handleMarkAllAsRead = () => {
    if (markAllAsReadMutation.isPending) return;
    markAllAsReadMutation.mutate(targetPlatformsCsv || "all");
  };

  const handleArchiveAll = () => {
    if (archiveAllMutation.isPending) return;
    archiveAllMutation.mutate(targetPlatformsCsv || "all");
  };

  const handleSelectPlatform = (value: BetaPlatform | null) => {
    setPlatformFilter(value);
    selectChat(null);
  };

  return (
    <div className="flex flex-col space-y-2 p-3 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="relative grow">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full bg-muted ps-9 pe-9"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearchInput("")}
              aria-label={t("clearSearch")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {platformChoices.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("filterByPlatform")}
                className={cn(platformFilter && "text-primary")}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => handleSelectPlatform(null)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {platformFilter === null ? <strong>{t("allPlatforms")}</strong> : t("allPlatforms")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {platformChoices.map(({ value, label, icon: Icon }) => {
                // "widget" has an empty static label and gets its display
                // string from the platforms namespace; everything else uses
                // the brand-name literal already on the option.
                const display = value === "widget" ? tPlatforms("widget") : label;
                return (
                  <DropdownMenuItem key={value} onClick={() => handleSelectPlatform(value)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {platformFilter === value ? <strong>{display}</strong> : display}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("moreActions")}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={handleToggleHistory}>
              {showArchived ? (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("backToChats")}
                </>
              ) : (
                <>
                  <History className="mr-2 h-4 w-4" />
                  {t("viewHistory")}
                </>
              )}
            </DropdownMenuItem>
            {isAdmin && !showArchived && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  {t("markAllAsRead")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleArchiveAll}
                  disabled={archiveAllMutation.isPending}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  {t("archiveAll")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showArchived && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50"
          onClick={handleToggleHistory}
        >
          <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <History className="h-4 w-4" />
            {t("viewingHistory")}
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <ArrowLeft className="h-3 w-3" />
            {t("back")}
          </span>
        </Button>
      )}
    </div>
  );
}
