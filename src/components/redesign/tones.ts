/**
 * Status tones of the redesign (promoted from the leave redesign, LV-00).
 *
 * Every pill uses one of these six tones, so the same meaning has the same
 * colour on every page: green = done/approved/paid, amber = waiting on
 * someone, blue = in progress, violet = a special waiting state, red =
 * rejected/failed, neutral = cancelled/draft/inactive. Classes follow the
 * design's badge (1px tinted border, tinted fill, strong text) and the
 * shipped Templates status colours. Section-specific status -> tone maps live
 * next to their section (leave `_components/ui/tones.ts`, e-commerce
 * `ecommerce/_components/ui/tones.ts`).
 */

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "violet"

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-border bg-muted/60 text-muted-foreground",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  success: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
  danger: "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
}

/** Solid dot colour for a tone (legends, the 6px dot inside a pill). */
export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-green-600",
  danger: "bg-destructive",
  violet: "bg-violet-500",
}
