/**
 * Button classes of the leave redesign (design: 32px primary/outline buttons,
 * 28px toolbar and row buttons, 6px radius, 13px / 12px text). Use them on
 * <button> / <Link>; shadcn <Button> stays fine inside dialogs.
 */
const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"

export const leaveButton = {
  /** 32px filled primary (header primary action, form submit). */
  primary: `${base} h-8 bg-primary px-2.5 text-[13px] text-primary-foreground hover:opacity-90`,
  /** 32px outline. */
  outline: `${base} h-8 border border-border bg-background px-2.5 text-[13px] text-foreground hover:bg-accent`,
  /** 28px outline for toolbars and table rows. */
  outlineSm: `${base} h-7 border border-border bg-background px-2 text-xs text-foreground hover:bg-accent`,
  /** 28px outline, destructive text (Reject, Cancel request). */
  dangerSm: `${base} h-7 border border-destructive/40 bg-background px-2 text-xs text-destructive hover:bg-destructive/10`,
  /** 28px filled primary for row actions (Approve). */
  primarySm: `${base} h-7 bg-primary px-2 text-xs text-primary-foreground hover:opacity-90`,
  /** 32px square ghost icon button (header icons). */
  ghostIcon: `${base} h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground`,
  /** 28px square ghost icon button (rows, cards). */
  ghostIconSm: `${base} h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground`,
} as const

export type LeaveButtonVariant = keyof typeof leaveButton
