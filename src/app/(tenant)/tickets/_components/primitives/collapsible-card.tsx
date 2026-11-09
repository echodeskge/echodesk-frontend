"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleCardProps {
  title: ReactNode;
  /** Muted text after the title ("2/4"), or any node (e.g. a progress bar). */
  summary?: ReactNode;
  /** Right-aligned control in the header (e.g. Upload). It sits outside the toggle button. */
  action?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * The detail page's section card (DC25): radius 10, a 44px header that
 * toggles the body, a muted/0.4 hover and a ChevronRight that rotates 90°
 * over .15s.
 */
export function CollapsibleCard({
  title,
  summary,
  action,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
  className,
  bodyClassName,
}: CollapsibleCardProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const bodyId = useId();

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  return (
    <section
      data-slot="collapsible-card"
      data-state={open ? "open" : "closed"}
      className={cn("rounded-[10px] border bg-card", className)}
    >
      <div
        data-slot="collapsible-card-header"
        className={cn(
          "flex h-11 items-center gap-2.5 pr-3.5 transition-colors hover:bg-muted/40",
          open ? "rounded-t-[9px]" : "rounded-[9px]",
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2.5 pl-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span
            data-slot="collapsible-card-chevron"
            className={cn(
              "flex text-muted-foreground transition-transform duration-150",
              open ? "rotate-90" : "rotate-0",
            )}
          >
            <ChevronRight aria-hidden="true" size={14} />
          </span>
          <span className="text-[13px] font-semibold leading-5">{title}</span>
          {summary != null && (
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-5 text-muted-foreground tabular-nums">
              {summary}
            </span>
          )}
        </button>
        {action != null && <div className="ml-auto flex shrink-0 items-center">{action}</div>}
      </div>
      <div id={bodyId} hidden={!open} className={cn("px-3.5 pb-3", bodyClassName)}>
        {open && children}
      </div>
    </section>
  );
}
