"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { useAuth } from "@/contexts/AuthContext"
import { useUserProfile } from "@/hooks/useUserProfile"
import { profileHasPermission } from "@/lib/backendPermissions"
import {
  activeSettingsId,
  filterSettingsNav,
  groupSettingsNav,
  matchesSettingsSearch,
  settingsNav,
  type SettingsNavItem,
} from "./settings-nav"

/**
 * The visible settings nav for the signed-in user. The gate code is the
 * pre-redesign sidebar's, moved here unchanged so the desktop nav, the mobile
 * list, the home grid and the header breadcrumb all agree.
 */
export function useSettingsNav() {
  const pathname = usePathname()
  const { hasFeature } = useSubscription()
  const { user } = useAuth()
  const { data: userProfile } = useUserProfile()

  const isStaffOrAdmin = Boolean(user?.is_staff || user?.is_superuser)

  // Use feature_keys from user profile (same as main sidebar)
  const userFeatureKeys: string[] = userProfile?.feature_keys
    ? typeof userProfile.feature_keys === "string"
      ? JSON.parse(userProfile.feature_keys)
      : userProfile.feature_keys
    : []

  const hasFeatureAccess = (keyOrKeys: string | string[]): boolean => {
    if (Array.isArray(keyOrKeys)) return keyOrKeys.some((key) => hasFeatureAccess(key))
    const key = keyOrKeys
    // Staff/superadmin see everything
    if (isStaffOrAdmin && userFeatureKeys.length === 0) return true
    // Check user's feature_keys first (from group), then fall back to subscription
    if (userFeatureKeys.length > 0) return userFeatureKeys.includes(key)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return hasFeature(key as any)
  }

  // Same rule as the backend's has_permission(): bare codenames from the
  // profile's permissions_list (role grants included), plus the staff bypass.
  const hasBackendPermission = (permission: string) =>
    profileHasPermission(userProfile as never, permission)
  const canManageSettings = isStaffOrAdmin || hasBackendPermission("can_manage_settings")
  const linkFor = (item: SettingsNavItem): string =>
    !canManageSettings && item.hrefWithoutManageSettings ? item.hrefWithoutManageSettings : item.href

  const visibleItems = filterSettingsNav(settingsNav, { isStaffOrAdmin, hasFeatureAccess, hasBackendPermission })
  const activeId = activeSettingsId(visibleItems, pathname)
  const activeItem = visibleItems.find((i) => i.id === activeId)

  return { pathname, visibleItems, activeId, activeItem, linkFor, isHome: pathname === "/settings" }
}

/** Search query shared by the header box, the nav and the home grid. */
const SearchContext = createContext<{ query: string; setQuery: (q: string) => void }>({ query: "", setQuery: () => {} })

export function SettingsSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("")
  const value = useMemo(() => ({ query, setQuery }), [query])
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSettingsSearch() {
  return useContext(SearchContext)
}

/** Visible items narrowed by the search (translated label + description), grouped for display. */
export function useFilteredSettingsGroups(items: SettingsNavItem[]) {
  const t = useTranslations("settings")
  const { query } = useSettingsSearch()
  const filtered = items.filter((i) => matchesSettingsSearch(query, t(i.labelKey), t(i.descKey)))
  return { query, groups: groupSettingsNav(filtered), count: filtered.length }
}
