"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ColorDot } from "./color-dot";

export type LabelChipSize = "sm" | "md" | "list";

const SIZE: Record<LabelChipSize, string> = {
  /** Card: 18px, radius 4, 11px. */
  sm: "h-[18px] rounded px-1.5 text-[11px]",
  /** Detail meta row: 22px, radius 6, 12px. */
  md: "h-[22px] rounded-md px-2 text-xs",
  /** List row: 20px, radius 4, 11px. */
  list: "h-5 rounded px-1.5 text-[11px]",
};

export interface LabelChipProps {
  name: string;
  color?: string | null;
  size?: LabelChipSize;
  className?: string;
}

/** An outlined label chip with a 6px colour dot. */
export function LabelChip({ name, color, size = "sm", className }: LabelChipProps) {
  return (
    <span
      data-slot="label-chip"
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center gap-[5px] whitespace-nowrap border text-foreground",
        SIZE[size],
        className,
      )}
    >
      <ColorDot color={color} size={6} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export interface LabelChipsProps {
  labels: { id?: number | string; name: string; color?: string | null }[];
  /** Chips shown before collapsing the rest into "+n" (DC16). */
  max?: number;
  size?: LabelChipSize;
  className?: string;
}

/** Up to `max` label chips, then a "+n" chip whose tooltip lists the rest. */
export function LabelChips({ labels, max = 3, size = "sm", className }: LabelChipsProps) {
  const t = useTranslations("ticketsScreen.card");
  if (labels.length === 0) return null;
  const shown = labels.slice(0, Math.max(0, max));
  const rest = labels.slice(shown.length);
  return (
    <span data-slot="label-chips" className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      {shown.map((l, i) => (
        <LabelChip key={l.id ?? `${l.name}-${i}`} name={l.name} color={l.color} size={size} />
      ))}
      {rest.length > 0 && (
        <span
          data-slot="label-chips-more"
          title={rest.map((l) => l.name).join(", ")}
          className={cn(
            "inline-flex shrink-0 items-center border text-muted-foreground tabular-nums",
            SIZE[size],
          )}
        >
          {t("moreLabels", { count: rest.length })}
        </span>
      )}
    </span>
  );
}
