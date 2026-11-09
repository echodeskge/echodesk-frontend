"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const RowLabelContext = createContext<string | undefined>(undefined);

/** The id of the enclosing PropertyRow's label, for `aria-labelledby`. */
export function usePropertyRowLabelId(): string | undefined {
  return useContext(RowLabelContext);
}

/** Label column width shared by the rail rows and the picker popover offset (DC34). */
export const PROPERTY_LABEL_WIDTH = 92;

export interface PropertyRowProps {
  label: ReactNode;
  children: ReactNode;
  /**
   * Read-only rows below the pickers (Time, Reporter, Created): 12px text and
   * 9px vertical padding instead of the picker rows' 38px min-height.
   */
  fixed?: boolean;
  className?: string;
}

/** A rail row: grid `92px minmax(0,1fr)`, gap 8, bottom border (D177, D186). */
export function PropertyRow({ label, children, fixed = false, className }: PropertyRowProps) {
  const labelId = useId();
  return (
    <RowLabelContext.Provider value={labelId}>
      <div
        data-slot="property-row"
        className={cn(
          "relative grid grid-cols-[92px_minmax(0,1fr)] items-start gap-2 border-b last:border-b-0",
          fixed ? "py-[9px] text-xs leading-5" : "min-h-[38px] py-[7px]",
          className,
        )}
      >
        <span id={labelId} className={cn("text-xs leading-5 text-muted-foreground", !fixed && "pt-1")}>
          {label}
        </span>
        <div className="min-w-0">{children}</div>
      </div>
    </RowLabelContext.Provider>
  );
}
