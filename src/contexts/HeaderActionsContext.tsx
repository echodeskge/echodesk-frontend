"use client"

import * as React from "react"

/**
 * Page-provided pieces of the app header (tenant layout):
 * - `breadcrumb`: shown after the page title, separated by "/"
 * - `primary`: the page's primary call to action (right side, before the divider)
 * - `icons`: page-specific icon buttons (right side, before theme / bell)
 *
 * The header renders inside the tenant layout, outside any route-level
 * NextIntlClientProvider or page context, so slot content must be plain
 * elements with already-translated text and props (no hooks that need the
 * page's providers).
 */
export interface HeaderSlot {
  breadcrumb?: React.ReactNode
  primary?: React.ReactNode
  icons?: React.ReactNode
}

interface HeaderActionsContextValue {
  slot: HeaderSlot | null
  setSlot: (slot: HeaderSlot | null) => void
}

const HeaderActionsContext = React.createContext<HeaderActionsContextValue | null>(null)

export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = React.useState<HeaderSlot | null>(null)
  const value = React.useMemo(() => ({ slot, setSlot }), [slot])
  return <HeaderActionsContext.Provider value={value}>{children}</HeaderActionsContext.Provider>
}

/** The current page's header slot (for the layout). */
export function useHeaderSlot(): HeaderSlot | null {
  return React.useContext(HeaderActionsContext)?.slot ?? null
}

/**
 * Put content into the app header while the calling component is mounted.
 * `deps` decide when the slot is refreshed (the elements themselves change
 * identity on every render).
 */
export function useHeaderActions(slot: HeaderSlot, deps: React.DependencyList) {
  const ctx = React.useContext(HeaderActionsContext)
  const setSlot = ctx?.setSlot
  React.useEffect(() => {
    if (!setSlot) return
    setSlot(slot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlot, ...deps])
  React.useEffect(() => {
    if (!setSlot) return
    return () => setSlot(null)
  }, [setSlot])
}
