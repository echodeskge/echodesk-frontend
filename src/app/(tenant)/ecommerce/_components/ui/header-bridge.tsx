"use client"

import { HeaderBridge, type HeaderAction, type HeaderBridgeProps } from "@/components/redesign/header-bridge"

export type EcHeaderAction = HeaderAction
export type EcommerceHeaderBridgeProps = Omit<HeaderBridgeProps, "testIdPrefix">

/**
 * Fills the app header for an e-commerce page: title from the sidebar label,
 * `breadcrumb` for detail pages ("Orders / #ORD-1021"), `sub` for counts,
 * the page's primary action (32px, icon-only below `sm`) and secondary ghost
 * actions. Labels must be translated strings (the header is outside the
 * e-commerce intl provider). Test ids: `ec-header-crumb`, `ec-header-sub`.
 */
export function EcommerceHeaderBridge(props: EcommerceHeaderBridgeProps) {
  return <HeaderBridge testIdPrefix="ec" {...props} />
}
