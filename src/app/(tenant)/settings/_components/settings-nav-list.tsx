"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronRight, Search, SearchX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SettingsNavItem } from "../_lib/settings-nav"
import { useFilteredSettingsGroups, useSettingsSearch } from "../_lib/use-settings-nav"

interface NavProps {
  items: SettingsNavItem[]
  activeId?: string
  linkFor: (item: SettingsNavItem) => string
}

/** "No settings match "…"" (design: 22px SearchX, 48px 16px padding, 13px muted). */
export function SettingsNoResults({ query, className }: { query: string; className?: string }) {
  const t = useTranslations("settings.shell")
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-4 py-12 text-muted-foreground", className)} data-testid="settings-no-results">
      <SearchX className="h-[22px] w-[22px]" aria-hidden />
      <span className="text-center text-[13px]">{t("noResults", { query: query.trim() })}</span>
    </div>
  )
}

/** Search input: 30px / 220px in the header (desktop), 36px full width on the mobile list. */
export function SettingsSearchInput({
  value,
  onChange,
  placeholder,
  clearLabel,
  size,
  className,
  testId,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  clearLabel: string
  size: "header" | "mobile"
  className?: string
  testId?: string
}) {
  return (
    <div className={cn("relative", size === "header" ? "w-[220px]" : "w-full", className)}>
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "header" ? "start-2 h-[13px] w-[13px]" : "start-2.5 h-3.5 w-3.5"
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={testId}
        className={cn(
          "w-full border border-input bg-background pe-7 outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 [&::-webkit-search-cancel-button]:hidden",
          size === "header" ? "h-[30px] rounded-md ps-[26px] text-xs font-normal" : "h-9 rounded-lg ps-8 text-[13px]"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          title={clearLabel}
          className="absolute end-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  )
}

/**
 * Design mobile settings nav: search box, then the full grouped list with
 * descriptions and chevrons (52px rows). Shown as the settings home below `md`.
 */
export function SettingsMobileList({ items, activeId, linkFor }: NavProps) {
  const t = useTranslations("settings")
  const { query, setQuery } = useSettingsSearch()
  const { groups } = useFilteredSettingsGroups(items)
  return (
    <nav aria-label={t("title")} className="flex flex-col gap-0.5 bg-muted/30 px-2.5 py-3 md:hidden" data-testid="settings-mobile-nav">
      <SettingsSearchInput
        size="mobile"
        value={query}
        onChange={setQuery}
        placeholder={t("shell.searchPlaceholder")}
        clearLabel={t("shell.clearSearch")}
        className="mb-2"
        testId="settings-search-mobile"
      />
      {groups.map(({ group, items: groupItems }, gi) => (
        <div key={group} className="flex flex-col gap-0.5" role="group" aria-labelledby={`settings-mnav-${group}`}>
          <div
            id={`settings-mnav-${group}`}
            className={cn(
              "flex h-[26px] items-center px-2.5 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground",
              gi > 0 && "mt-2.5"
            )}
          >
            {t(`navGroups.${group}`)}
          </div>
          {groupItems.map((item) => {
            const Icon = item.icon
            const active = item.id === activeId
            return (
              <Link
                key={item.id}
                href={linkFor(item)}
                data-testid={`settings-mnav-${item.id}`}
                className={cn(
                  "flex min-h-[52px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-background font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                )}
              >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{t(item.labelKey)}</span>
                  <span className="truncate text-[11px] font-normal text-muted-foreground">{t(item.descKey)}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
              </Link>
            )
          })}
        </div>
      ))}
      {groups.length === 0 && <SettingsNoResults query={query} />}
    </nav>
  )
}
