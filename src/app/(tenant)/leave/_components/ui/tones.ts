/**
 * Status tones for the leave redesign (LV-00).
 *
 * Every pill in the leave section uses one of these six tones, so the same
 * meaning has the same colour on every page: green = done/approved, amber =
 * waiting on someone, blue = part-way through approval, violet = waiting on
 * substitutes, red = rejected/returned, neutral = cancelled/draft/skipped.
 * Classes follow the design's badge (1px tinted border, tinted fill, strong
 * text) and the shipped Templates status colours.
 */

export type LeaveTone = "neutral" | "info" | "warning" | "success" | "danger" | "violet"

export const TONE_CLASS: Record<LeaveTone, string> = {
  neutral: "border-border bg-muted/60 text-muted-foreground",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  success: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
  danger: "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
}

/** Solid dot colour for a tone (legends, the 6px dot inside a pill). */
export const TONE_DOT: Record<LeaveTone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-green-600",
  danger: "bg-destructive",
  violet: "bg-violet-500",
}

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
