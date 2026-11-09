"use client"

import { HeaderBridge, type HeaderAction, type HeaderBridgeProps } from "@/components/redesign/header-bridge"

export type LeaveHeaderAction = HeaderAction
export type LeaveHeaderBridgeProps = Omit<HeaderBridgeProps, "testIdPrefix">

/**
 * Fills the app header for a leave page: the shared redesign `HeaderBridge`
 * (promoted to `@/components/redesign`) with leave's test ids
 * (`leave-header-crumb`, `leave-header-sub`).
 */
export function LeaveHeaderBridge(props: LeaveHeaderBridgeProps) {
  return <HeaderBridge testIdPrefix="leave" {...props} />
}
