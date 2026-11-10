"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { SettingsNavItem } from "./_lib/settings-nav"
import { useFilteredSettingsGroups } from "./_lib/use-settings-nav"
import { SettingsNoResults } from "./_components/settings-nav-list"

// The nav items and their gates live in _lib/settings-nav.ts (unchanged gate
// fields + the design group / description); the gate code is in
// _lib/use-settings-nav.tsx (moved from here unchanged).

interface NavProps {
  items: SettingsNavItem[]
  activeId?: string
  linkFor: (item: SettingsNavItem) => string
}

/**
 * Design settings nav (desktop column): group labels (26px, 11px uppercase),
 * items with a 26px icon tile, 13px label; the active item is raised.
 * Hidden below `md`, where the settings home is the nav.
 */
export function SettingsSidebar({ items, activeId, linkFor }: NavProps) {
  const t = useTranslations("settings")
  const { query, groups } = useFilteredSettingsGroups(items)
  return (
    <nav
      aria-label={t("title")}
      className="hidden w-[232px] shrink-0 flex-col gap-0.5 overflow-y-auto border-e bg-muted/30 px-2.5 py-3 md:flex"
      data-testid="settings-nav"
    >
      {groups.map(({ group, items: groupItems }, gi) => (
        <div key={group} className="flex flex-col gap-0.5" role="group" aria-labelledby={`settings-nav-${group}`}>
          <div
            id={`settings-nav-${group}`}
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
                aria-current={active ? "page" : undefined}
                data-testid={`settings-nav-${item.id}`}
                className={cn(
                  "flex min-h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      ))}
      {groups.length === 0 && <SettingsNoResults query={query} className="py-8" />}
    </nav>
  )
}
