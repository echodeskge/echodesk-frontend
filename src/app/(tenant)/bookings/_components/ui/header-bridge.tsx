"use client"

import { HeaderBridge, type HeaderAction, type HeaderBridgeProps } from "@/components/redesign/header-bridge"

export type BookingsHeaderAction = HeaderAction
export type BookingsHeaderBridgeProps = Omit<HeaderBridgeProps, "testIdPrefix">

/**
 * Fills the app header for a bookings page: title from the sidebar label,
 * `breadcrumb` for drill-downs ("Bookings / #BK-1054"), `sub` for counts, the
 * page's primary action and secondary ghost actions. Labels must be
 * translated strings (the header is outside the bookings intl provider).
 * Test ids: `bkg-header-crumb`, `bkg-header-sub`.
 */
export function BookingsHeaderBridge(props: BookingsHeaderBridgeProps) {
  return <HeaderBridge testIdPrefix="bkg" {...props} />
}
