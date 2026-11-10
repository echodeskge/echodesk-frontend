"use client"

import { createContext, useContext, useEffect } from "react"

/**
 * Optional drill-down crumb after the settings page label in the app header
 * ("Settings / Item lists / Branches"). Settings pages must not publish their
 * own header slot (it would replace the shell's breadcrumb and search box);
 * they call `useSettingsSubCrumb(label)` instead.
 */
export const SettingsCrumbContext = createContext<(label: string | null) => void>(() => {})

export function useSettingsSubCrumb(label: string | null | undefined) {
  const set = useContext(SettingsCrumbContext)
  useEffect(() => {
    set(label || null)
    return () => set(null)
  }, [set, label])
}
