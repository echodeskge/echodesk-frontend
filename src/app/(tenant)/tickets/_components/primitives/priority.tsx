"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getPriorityStyle } from "../../_lib/priority";

export interface PriorityPillProps {
  priority: string | null | undefined;
  /** `sm` = card (18px), `md` = detail meta row (22px). */
  size?: "sm" | "md";
  className?: string;
}

/** Priority as a tinted pill with its Signal icon and translated label (D10, E17). */
export function PriorityPill({ priority, size = "sm", className }: PriorityPillProps) {
  const t = useTranslations("tickets");
  const style = getPriorityStyle(priority);
  const Icon = style.icon;
  return (
    <span
      data-slot="priority-pill"
      data-priority={style.value ?? "unknown"}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap",
        size === "md"
          ? "h-[22px] gap-1 rounded-md px-2 text-xs font-semibold"
          : "h-[18px] gap-[3px] rounded px-1.5 text-[11px] font-medium",
        className,
      )}
      style={{ color: style.color, background: style.bg }}
    >
      <Icon aria-hidden="true" size={size === "md" ? 12 : 11} />
      {t(style.labelKey)}
    </span>
  );
}

export interface PriorityIconProps {
  priority: string | null | undefined;
  size?: number;
  className?: string;
}

/** The bare priority icon in its colour (list rows), labelled for AT. */
export function PriorityIcon({ priority, size = 15, className }: PriorityIconProps) {
  const t = useTranslations("tickets");
  const style = getPriorityStyle(priority);
  const Icon = style.icon;
  const label = t(style.labelKey);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-slot="priority-icon"
      data-priority={style.value ?? "unknown"}
      className={cn("inline-flex shrink-0", className)}
      style={{ color: style.color }}
    >
      <Icon aria-hidden="true" size={size} />
    </span>
  );
}
