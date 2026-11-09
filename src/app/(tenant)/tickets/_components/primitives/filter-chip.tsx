"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface FilterChipProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  icon: LucideIcon;
  label: string;
  /** The (first) selected value, shown after a divider when active. */
  valueLabel?: string;
  /** Further selected values beyond `valueLabel`: renders "first +n" (DC4). */
  extraCount?: number;
  active: boolean;
}

/**
 * Toolbar filter chip: dashed and transparent while inactive (with a trailing
 * Plus), solid with an accent fill and the value after a divider when active.
 * Forwards its ref so it can be a Popover trigger (`asChild`).
 */
export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { icon: Icon, label, valueLabel, extraCount = 0, active, className, type = "button", ...props },
  ref,
) {
  const t = useTranslations("ticketsScreen.filters");
  const value = active && valueLabel
    ? extraCount > 0
      ? t("valueMulti", { first: valueLabel, count: extraCount })
      : valueLabel
    : null;
  return (
    <button
      ref={ref}
      type={type}
      data-slot="filter-chip"
      data-active={active ? "true" : "false"}
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border pl-2.5 pr-2 text-xs text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-solid bg-accent" : "border-dashed bg-transparent",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" size={13} />
      <span className="text-foreground">{label}</span>
      {value && (
        <span data-slot="filter-chip-value" className="border-l pl-1.5 font-medium text-foreground">
          {value}
        </span>
      )}
      {!active && <Plus aria-hidden="true" data-slot="filter-chip-plus" size={12} />}
    </button>
  );
});
