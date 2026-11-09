"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusTrackColumn {
  id: number;
  name: string;
  color?: string | null;
}

export interface StatusTrackLabels {
  /** Accessible name of the track ("Status"). */
  label: string;
  /** Tooltip / accessible name of a step ("Move to {title}"). */
  moveTo: (title: string) => string;
  /** Screen-reader suffix for completed steps ("Done"). */
  done: string;
}

export interface StatusTrackProps {
  columns: StatusTrackColumn[];
  currentColumnId: number | null | undefined;
  onMove: (columnId: number) => void;
  /** Steps the viewer can't move to (or every step while a move is pending). */
  disabledIds?: number[];
  labels: StatusTrackLabels;
  className?: string;
}

export type StepState = "done" | "current" | "future";

const FALLBACK = "hsl(var(--muted-foreground))";

/**
 * Detail status track (D113–D117, DC22): one numbered step per column, at
 * least 120px wide, scrolling horizontally. Done steps show a Check, the
 * current step has `aria-current="step"`, a background fill and an underline
 * in the column colour, and is scrolled into view.
 */
export function StatusTrack({ columns, currentColumnId, onMove, disabledIds = [], labels, className }: StatusTrackProps) {
  const currentIndex = columns.findIndex((c) => c.id === currentColumnId);
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [currentColumnId, columns.length]);

  return (
    <nav
      aria-label={labels.label}
      data-slot="status-track"
      className={cn("flex shrink-0 items-stretch overflow-x-auto border-b bg-muted/30", className)}
    >
      <ol className="flex min-w-full items-stretch">
        {columns.map((col, i) => {
          const state: StepState = currentIndex < 0 ? "future" : i < currentIndex ? "done" : i === currentIndex ? "current" : "future";
          const color = col.color || FALLBACK;
          const disabled = disabledIds.includes(col.id);
          const filled = state !== "future";
          return (
            <li key={col.id} className="flex min-w-[120px] flex-1">
              <button
                ref={state === "current" ? currentRef : undefined}
                type="button"
                data-slot="status-step"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                title={labels.moveTo(col.name)}
                disabled={disabled}
                onClick={() => {
                  if (state !== "current" && !disabled) onMove(col.id);
                }}
                className={cn(
                  "relative flex h-10 w-full min-w-[120px] items-center gap-2 whitespace-nowrap border-r px-4 text-left text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  state === "current" && "bg-background font-semibold text-foreground",
                  state === "done" && "font-medium text-foreground",
                  state === "future" && "font-medium text-muted-foreground",
                  disabled ? "cursor-not-allowed opacity-50" : state === "current" ? "cursor-default" : "cursor-pointer hover:bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  data-slot="status-step-dot"
                  className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold leading-none",
                    !filled && "border-border bg-transparent text-muted-foreground",
                  )}
                  style={filled ? { background: color, borderColor: color, color: "#fff" } : undefined}
                >
                  {state === "done" ? <Check size={10} strokeWidth={3} /> : i + 1}
                </span>
                <span className="truncate">{col.name}</span>
                {state === "done" && <span className="sr-only">({labels.done})</span>}
                {state === "current" && (
                  <span
                    aria-hidden="true"
                    data-slot="status-step-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5"
                    style={{ background: color }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
