/**
 * Status colours of the calendar (BKG-02): the legend squares and the solid
 * event bars of the month / week / day / list views, and the tinted blocks of
 * the Specialists timeline. Same hues as the section's pills
 * (`_components/ui/tones.ts`): amber = pending, blue = confirmed, violet = in
 * progress, green = completed, red = cancelled, grey = no-show.
 */
import { TONE_DOT, bookingStatusTone } from "../../_components/ui/tones"

/** The five statuses of the legend, in design order. */
export const LEGEND_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const

const SOLID: Record<string, string> = {
  pending: "bg-amber-500 text-white",
  confirmed: "bg-blue-600 text-white",
  in_progress: "bg-violet-600 text-white",
  completed: "bg-green-600 text-white",
  cancelled: "bg-red-600 text-white",
  no_show: "bg-zinc-500 text-white",
}

const SOFT: Record<string, string> = {
  pending: "border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-100",
  confirmed: "border-blue-600 bg-blue-600/15 text-blue-950 dark:text-blue-100",
  in_progress: "border-violet-600 bg-violet-600/15 text-violet-950 dark:text-violet-100",
  completed: "border-green-600 bg-green-600/15 text-green-950 dark:text-green-100",
  cancelled: "border-red-600 bg-red-600/10 text-red-950 line-through dark:text-red-100",
  no_show: "border-zinc-500 bg-zinc-500/15 text-zinc-800 dark:text-zinc-100",
}

/** Filled bar (white text) for a status. */
export function statusSolidClass(status: string | null | undefined): string {
  return SOLID[status ?? ""] ?? SOLID.pending
}

/** Tinted block with a 3px left border for a status (Specialists timeline). */
export function statusSoftClass(status: string | null | undefined): string {
  return SOFT[status ?? ""] ?? SOFT.pending
}

/** The legend / list dot colour for a status. */
export function statusDotClass(status: string | null | undefined): string {
  return TONE_DOT[bookingStatusTone(status)]
}
