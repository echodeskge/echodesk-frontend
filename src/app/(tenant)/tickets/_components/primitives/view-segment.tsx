"use client";

import { useRef, type KeyboardEvent } from "react";
import { Kanban, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewValue = "board" | "list";

export interface ViewSegmentProps {
  value: ViewValue;
  onChange: (value: ViewValue) => void;
  labels: Record<ViewValue, string>;
  /** Options to leave out (List while `flags.listViewEnabled` is false, DC3). */
  hidden?: ViewValue[];
  /** Accessible name of the group. */
  ariaLabel?: string;
  className?: string;
}

const OPTIONS: { value: ViewValue; icon: typeof Kanban }[] = [
  { value: "board", icon: Kanban },
  { value: "list", icon: List },
];

/** The Board/List segmented control (28px, muted track, raised active segment). */
export function ViewSegment({ value, onChange, labels, hidden = [], ariaLabel, className }: ViewSegmentProps) {
  const options = OPTIONS.filter((o) => !hidden.includes(o.value));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (options.length === 0) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="view-segment"
      className={cn("inline-flex h-7 shrink-0 gap-0.5 rounded-md bg-muted p-0.5", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-state={selected ? "on" : "off"}
            onClick={() => !selected && onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" size={14} />
            {labels[o.value]}
          </button>
        );
      })}
    </div>
  );
}
