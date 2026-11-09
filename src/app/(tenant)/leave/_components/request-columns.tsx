"use client"

import type { ReactNode } from "react"
import {
  LeaveTypeChip,
  PersonCell,
  RequestStatusPill,
  formatDays,
  formatLeaveDate,
  formatLeaveRange,
  parseDays,
  type LeaveColumn,
} from "./ui"

/** The list fields every approvals table shows (LeaveRequestListSerializer and the covering list). */
export interface RequestRowBase {
  id: number
  employee_name: string
  leave_type_name: string
  leave_type_color?: string | null
  start_date: string
  end_date: string
  total_days: string
  status: string
  created_at: string
}

/** The `leave` namespace translator. */
type T = (key: string, values?: Record<string, string | number>) => string

/** "3 days" / "3 დღე", "—" when missing. */
export function daysLabel(t: T, value: string | null | undefined): string {
  const n = parseDays(value)
  return n === null ? "—" : t("ui.days", { count: Number(formatDays(n)) })
}

/**
 * Columns shared by team requests, all requests and covering:
 * employee (title), type, period, days (meta), [extra], status (end),
 * submitted (desktop only, optional) and actions (optional).
 */
export function requestColumns<R extends RequestRowBase>({
  t,
  locale,
  extra = [],
  submitted = false,
  actions,
  actionsWidth = "168px",
}: {
  t: T
  locale: string
  /** Columns inserted between days and status (covering: task, my answer). */
  extra?: LeaveColumn<R>[]
  submitted?: boolean
  actions?: (row: R) => ReactNode
  actionsWidth?: string
}): LeaveColumn<R>[] {
  const cols: LeaveColumn<R>[] = [
    {
      id: "employee",
      header: t("shared.employee"),
      width: "minmax(0,1.3fr)",
      mobile: "title",
      cell: (r) => <PersonCell name={r.employee_name} />,
    },
    {
      id: "type",
      header: t("shared.leaveType"),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (r) => <LeaveTypeChip name={r.leave_type_name} color={r.leave_type_color} />,
    },
    {
      id: "period",
      header: t("hr.detail.period"),
      width: "minmax(120px,.9fr)",
      mobile: "meta",
      cell: (r) => <span className="truncate tabular-nums">{formatLeaveRange(r.start_date, r.end_date, locale)}</span>,
    },
    {
      id: "days",
      header: t("shared.days"),
      width: "72px",
      align: "end",
      mobile: "meta",
      cell: (r) => <span className="tabular-nums">{daysLabel(t, r.total_days)}</span>,
    },
    ...extra,
    {
      id: "status",
      header: t("shared.statusLabel"),
      width: "minmax(170px,1fr)",
      mobile: "end",
      cell: (r) => <RequestStatusPill status={r.status} />,
    },
  ]
  if (submitted) {
    cols.push({
      id: "submitted",
      header: t("shared.submitted"),
      width: "96px",
      mobile: "hidden",
      muted: true,
      cell: (r) => <span className="tabular-nums">{formatLeaveDate(r.created_at, locale)}</span>,
    })
  }
  if (actions) {
    cols.push({
      id: "actions",
      header: <span className="sr-only">{t("shared.actions")}</span>,
      width: actionsWidth,
      align: "end",
      mobile: "actions",
      cell: (r) => actions(r),
    })
  }
  return cols
}
