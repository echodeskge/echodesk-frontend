import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type SectionLabelProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/** The small uppercase section heading (11/500, +.04em; sidebar "Views", rail "Customer"). */
export function SectionLabel<T extends ElementType = "span">({ as, className, ...props }: SectionLabelProps<T>) {
  const Comp: ElementType = as ?? "span";
  return (
    <Comp
      data-slot="section-label"
      className={cn("text-[11px] font-medium uppercase leading-5 tracking-[.04em] text-muted-foreground", className)}
      {...props}
    />
  );
}

export interface VDividerProps {
  /** Horizontal margin in px on each side. */
  spacing?: 4 | 6;
  className?: string;
}

/** A 16px vertical rule between toolbar groups. */
export function VDivider({ spacing = 4, className }: VDividerProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="v-divider"
      className={cn("inline-block h-4 w-px shrink-0 bg-border", spacing === 6 ? "mx-1.5" : "mx-1", className)}
    />
  );
}
