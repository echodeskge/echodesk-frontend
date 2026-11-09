"use client";

import type { ComponentProps, ReactNode } from "react";
import { FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CURRENCY_SIGN, ecField } from "@/app/(tenant)/ecommerce/_components/ui";
import { cn } from "@/lib/utils";

/**
 * Class names that give the shadcn react-hook-form pieces (FormItem,
 * FormLabel, FormDescription, FormMessage) the e-commerce form sizes:
 * 13px/500 label, 34px inputs, 12px help and error (EC-02 sheets).
 */
export const rhf = {
  item: "min-w-0 content-start gap-1.5",
  label: "text-[13px] font-medium leading-4",
  help: "text-xs leading-4",
  message: "text-xs leading-4",
  input: ecField.input,
  textarea: ecField.textarea,
  select: cn(ecField.select, "w-full"),
} as const;

/**
 * A 34px number input with the lari sign inside on the right (prices).
 * Renders the FormControl itself, so the label and error stay linked.
 */
export function MoneyInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative min-w-0">
      <FormControl>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          {...props}
          className={cn(rhf.input, "pe-7 tabular-nums", className)}
        />
      </FormControl>
      <span
        aria-hidden
        className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
      >
        {CURRENCY_SIGN}
      </span>
    </div>
  );
}

/** Three columns from `sm` (price / old price / cost), two below. */
export function FormGrid3({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3", className)}>{children}</div>;
}
