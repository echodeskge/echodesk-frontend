"use client"

import { RequestStatusPill } from "./ui/pills"

/**
 * Status badge for a leave request (all statuses incl. awaiting_substitutes).
 * LV-00: renders the redesign's `RequestStatusPill` (tone pill with a dot);
 * kept so pages that are not redesigned yet pick up the new look unchanged.
 */
export function LeaveStatusBadge({ status }: { status: string }) {
  return <RequestStatusPill status={status} />
}
