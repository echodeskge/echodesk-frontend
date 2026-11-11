import { rdButton } from "@/components/redesign/buttons"

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"

/** The shared redesign buttons plus the bookings section's filled destructive action (design "Cancel" on the booking detail). */
export const bkgButton = {
  ...rdButton,
  /** 32px filled destructive (Cancel booking). */
  danger: `${base} h-8 bg-destructive px-2.5 text-[13px] text-white hover:opacity-90`,
  /** 32px outline, destructive text (No-show). */
  dangerOutline: `${base} h-8 border border-destructive/40 bg-background px-2.5 text-[13px] text-destructive hover:bg-destructive/10`,
} as const
