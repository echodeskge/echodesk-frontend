"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useTenant } from "@/contexts/TenantContext"
import { useFilteredSettingsGroups, useSettingsNav } from "../_lib/use-settings-nav"
import { SettingsMobileList, SettingsNoResults } from "./settings-nav-list"

/**
 * Design settings HOME: "Workspace settings", then one block per nav group
 * with cards (34px icon tile, 13px label, 12px description) in an auto-fill
 * grid of 240px columns. Built from the same filtered nav as the sidebar, so
 * it never shows a page the user can't open. Below `md` the home is the
 * mobile nav list instead.
 */
export function SettingsHome() {
  const t = useTranslations("settings")
  const { tenant } = useTenant()
  const { visibleItems, activeId, linkFor } = useSettingsNav()
  const { query, groups } = useFilteredSettingsGroups(visibleItems)
  const name = tenant?.tenant_name?.trim()
  return (
    <>
      <SettingsMobileList items={visibleItems} activeId={activeId} linkFor={linkFor} />
      <section className="hidden p-6 md:block" data-testid="settings-home">
        <div className="flex max-w-[960px] flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.02em]">{t("shell.homeTitle")}</h2>
            <p className="text-[13px] text-muted-foreground [text-wrap:pretty]">
              {name ? t("shell.homeDescription", { name }) : t("shell.homeDescriptionNoName")}
            </p>
          </div>
          {groups.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-2.5" data-testid={`settings-home-group-${group}`}>
              <h3 className="text-xs font-semibold uppercase tracking-[.04em] text-muted-foreground">{t(`navGroups.${group}`)}</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      href={linkFor(item)}
                      data-testid={`settings-home-${item.id}`}
                      className="flex gap-3 rounded-[10px] border bg-card p-3.5 text-start transition-[border-color,box-shadow] duration-150 hover:border-muted-foreground/40 hover:shadow-[0_1px_3px_rgb(0_0_0/0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[13px] font-semibold">{t(item.labelKey)}</span>
                        <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{t(item.descKey)}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && <SettingsNoResults query={query} />}
        </div>
      </section>
    </>
  )
}
