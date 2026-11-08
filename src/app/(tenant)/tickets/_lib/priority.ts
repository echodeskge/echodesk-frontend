/**
 * Ticket priority display map (design D10, plan E17).
 *
 * The backend values are `low | medium | high | critical`; there is no
 * "urgent". Critical and high share the red and the SignalHigh icon.
 * Labels come from the global `tickets.priority.<value>` keys.
 */
import { Signal, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from "lucide-react";

export const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;
export type TicketPriority = (typeof PRIORITY_VALUES)[number];

export interface PriorityStyle {
  value: TicketPriority | null;
  /** Text and icon colour. */
  color: string;
  /** Pill background: the colour at 10% alpha (`#rrggbb1a`). */
  bg: string;
  icon: LucideIcon;
  /** Key under the global `tickets` namespace. */
  labelKey: string;
  /** Sort rank: critical 0, high 1, medium 2, low 3, unknown 4 (matches the server's `priority_rank`). */
  rank: number;
}

const RED = "#dc3545";
const ORANGE = "#fd7e14";
const GREEN = "#28a745";
export const PRIORITY_FALLBACK_COLOR = "#6c757d";

const MAP: Record<TicketPriority, Omit<PriorityStyle, "value" | "bg" | "labelKey">> = {
  critical: { color: RED, icon: SignalHigh, rank: 0 },
  high: { color: RED, icon: SignalHigh, rank: 1 },
  medium: { color: ORANGE, icon: SignalMedium, rank: 2 },
  low: { color: GREEN, icon: SignalLow, rank: 3 },
};

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === "string" && (PRIORITY_VALUES as readonly string[]).includes(value);
}

export function getPriorityStyle(priority: string | null | undefined): PriorityStyle {
  const value = typeof priority === "string" ? priority.toLowerCase() : priority;
  if (isTicketPriority(value)) {
    const m = MAP[value];
    return { value, ...m, bg: `${m.color}1a`, labelKey: `priority.${value}` };
  }
  return {
    value: null,
    color: PRIORITY_FALLBACK_COLOR,
    bg: `${PRIORITY_FALLBACK_COLOR}1a`,
    icon: Signal,
    labelKey: "priorityLabel",
    rank: 4,
  };
}

/** Options for pickers, highest first (critical, high, medium, low). */
export const PRIORITY_OPTIONS: readonly TicketPriority[] = ["critical", "high", "medium", "low"];
