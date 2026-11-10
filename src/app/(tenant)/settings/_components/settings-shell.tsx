"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft } from "lucide-react"
import { useHeaderActions } from "@/contexts/HeaderActionsContext"
import { SaveBarSlotProvider } from "@/components/redesign/settings/sticky-save-bar"
import { SettingsSearchProvider, useSettingsNav, useSettingsSearch } from "../_lib/use-settings-nav"
import { SettingsCrumbContext } from "../_lib/settings-crumb"
import { SettingsSearchInput } from "./settings-nav-list"
import { SettingsSidebar } from "../settings-sidebar"

/**
 * Fills the app header for every settings route (design settings header):
 * "Settings / <page>" (the app header shows "Settings"; this adds the page),
 * a back chevron to the settings home on phones, and the 220px
 * "Search settings…" box on desktop. Settings pages must not publish their
 * own header slot (it would replace this one); a drill-down crumb goes through
 * `useSettingsSubCrumb` (_lib/settings-crumb).
 */
function SettingsHeaderBridge({
  pageLabel,
  pageHref,
  subLabel,
}: {
  pageLabel: string | null
  pageHref: string | null
  subLabel: string | null
}) {
  const t = useTranslations("settings.shell")
  const { query, setQuery } = useSettingsSearch()
  const placeholder = t("searchPlaceholder")
  const clearLabel = t("clearSearch")
  const backLabel = t("back")
  useHeaderActions(
    {
      breadcrumb: pageLabel ? (
        <span className="flex min-w-0 items-center gap-1" data-testid="settings-header-crumb">
          <Link
            href="/settings"
            aria-label={backLabel}
            title={backLabel}
            className="-ms-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent sm:hidden"
            data-testid="settings-header-back"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          {/* With a drill-down crumb the page label links back on desktop; phones show only the last crumb. */}
          {subLabel ? (
            <>
              <Link href={pageHref ?? "/settings"} className="hidden truncate hover:underline sm:inline">
                {pageLabel}
              </Link>
              <span aria-hidden className="hidden font-normal text-muted-foreground sm:inline">/</span>
              <span className="truncate">{subLabel}</span>
            </>
          ) : (
            <span className="truncate">{pageLabel}</span>
          )}
        </span>
      ) : undefined,
      icons: (
        <span className="hidden items-center md:flex">
          <SettingsSearchInput
            size="header"
            value={query}
            onChange={setQuery}
            placeholder={placeholder}
            clearLabel={clearLabel}
            testId="settings-search"
          />
          <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        </span>
      ),
    },
    [pageLabel ?? "", pageHref ?? "", subLabel ?? "", query, placeholder, clearLabel, backLabel]
  )
  return null
}

/**
 * Settings route shell: full-height row of the grouped nav (desktop) and the
 * content column. The content column scrolls (`settings-scroll`) and keeps a
 * slot under the scroll area for the sticky save bar.
 */
function Shell({ children }: { children: ReactNode }) {
  const t = useTranslations("settings")
  const { visibleItems, activeId, pageItem, linkFor } = useSettingsNav()
  const [saveSlot, setSaveSlot] = useState<HTMLDivElement | null>(null)
  const [subLabel, setSubLabel] = useState<string | null>(null)
  return (
    <div className="flex h-full min-h-0 w-full" data-testid="settings-shell">
      <SettingsHeaderBridge
        pageLabel={pageItem ? t(pageItem.labelKey) : null}
        pageHref={pageItem ? linkFor(pageItem) : null}
        subLabel={pageItem ? subLabel : null}
      />
      <SettingsSidebar items={visibleItems} activeId={activeId} linkFor={linkFor} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SettingsCrumbContext.Provider value={setSubLabel}>
          <SaveBarSlotProvider node={saveSlot}>
            <div className="min-h-0 flex-1 overflow-y-auto" data-testid="settings-scroll">
              {children}
            </div>
          </SaveBarSlotProvider>
        </SettingsCrumbContext.Provider>
        <div ref={setSaveSlot} className="contents" data-testid="settings-savebar-slot" />
      </div>
    </div>
  )
}

export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <SettingsSearchProvider>
      <Shell>{children}</Shell>
    </SettingsSearchProvider>
  )
}
