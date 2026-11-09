/**
 * Status tones for the leave redesign (LV-00).
 *
 * Every pill in the leave section uses one of the six shared tones, so the same
 * meaning has the same colour on every page: green = done/approved, amber =
 * waiting on someone, blue = part-way through approval, violet = waiting on
 * substitutes, red = rejected/returned, neutral = cancelled/draft/skipped.
 * Classes follow the design's badge (1px tinted border, tinted fill, strong
 * text) and the shipped Templates status colours.
 */

import type { Tone } from "@/components/redesign/tones"

// The tone palette is shared (promoted to `@/components/redesign/tones`); the
// leave status -> tone maps below stay here.
export { TONE_CLASS, TONE_DOT } from "@/components/redesign/tones"
export type LeaveTone = Tone

/** Leave request status -> tone. Unknown statuses read as pending (as `leaveStatusKey` does). */
export function requestStatusTone(status: string | null | undefined): LeaveTone {
  switch (status) {
    case "awaiting_substitutes":
      return "violet"
    case "manager_approved":
    case "hr_approved":
      return "info"
    case "approved":
      return "success"
    case "rejected":
      return "danger"
    case "cancelled":
      return "neutral"
    default:
      return "warning"
  }
}

/** Substitute consent status (pending / accepted / rejected / skipped) -> tone. */
export function substituteStatusTone(status: string | null | undefined): LeaveTone {
  switch (status) {
    case "accepted":
      return "success"
    case "rejected":
      return "danger"
    case "skipped":
      return "neutral"
    default:
      return "warning"
  }
}

/** KPI goal status (draft / pending / approved / returned) -> tone. */
export function kpiStatusTone(status: string | null | undefined): LeaveTone {
  switch (status) {
    case "approved":
      return "success"
    case "pending":
      return "warning"
    case "returned":
      return "danger"
    default:
      return "neutral"
  }
}
