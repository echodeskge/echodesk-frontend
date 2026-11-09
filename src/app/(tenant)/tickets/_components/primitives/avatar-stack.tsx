import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "./initials";

export type AvatarSize = 14 | 20 | 22 | 24;

interface SizeSpec {
  box: string;
  text: string;
  /** Overlap applied to every avatar after the first. */
  overlap: string;
  /** Ring (border) width. */
  ring: string;
  icon: number;
}

/**
 * 14 = rail pill avatar, 20 = card (D-card row 3), 22 = list row,
 * 24 = header viewers (2px ring, −6px overlap).
 */
export const AVATAR_SIZES: Record<AvatarSize, SizeSpec> = {
  14: { box: "size-3.5", text: "text-[6px] font-bold", overlap: "-ml-[3px]", ring: "border", icon: 8 },
  20: { box: "size-5", text: "text-[9px] font-semibold", overlap: "-ml-1", ring: "border-[1.5px]", icon: 11 },
  22: { box: "size-[22px]", text: "text-[9px] font-semibold", overlap: "-ml-[5px]", ring: "border-[1.5px]", icon: 11 },
  24: { box: "size-6", text: "text-[10px] font-semibold", overlap: "-ml-1.5", ring: "border-2", icon: 12 },
};

export interface AvatarStackUser {
  id: number | string;
  name: string;
}

export interface AvatarStackProps {
  users: AvatarStackUser[];
  size?: AvatarSize;
  /** Avatars shown before the "+n" circle. */
  max?: number;
  /** Accessible title of the dashed empty circle; no empty circle when omitted. */
  emptyLabel?: string;
  /** The ring matches what the stack sits on: `card` on cards, `background` elsewhere (DC14). */
  ringColor?: "card" | "background";
  /** `primary` = primary/10 tint (assignees), `muted` = muted fill (viewers). Defaults by size. */
  tone?: "primary" | "muted";
  /** Accessible text for the "+n" circle; defaults to the hidden names. */
  overflowLabel?: (count: number) => string;
  className?: string;
}

/** Overlapping initials avatars with a "+n" overflow and a dashed "unassigned" empty state. */
export function AvatarStack({
  users,
  size = 20,
  max = 3,
  emptyLabel,
  ringColor = "card",
  tone,
  overflowLabel,
  className,
}: AvatarStackProps) {
  const spec = AVATAR_SIZES[size];
  const fill = (tone ?? (size === 24 ? "muted" : "primary")) === "muted"
    ? "bg-muted text-foreground"
    : size === 14
      ? "bg-primary/15 text-primary"
      : "bg-primary/10 text-primary";
  const ring = ringColor === "background" ? "border-background" : "border-card";

  if (users.length === 0) {
    if (!emptyLabel) return null;
    return (
      <span
        role="img"
        aria-label={emptyLabel}
        title={emptyLabel}
        data-slot="avatar-empty"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground",
          spec.box,
          className,
        )}
      >
        <UserRound aria-hidden="true" size={spec.icon} />
      </span>
    );
  }

  const shown = users.slice(0, Math.max(1, max));
  const rest = users.slice(shown.length);
  const circle = cn("flex shrink-0 items-center justify-center rounded-full leading-none", spec.box, spec.ring, ring, spec.text);

  return (
    <span data-slot="avatar-stack" data-size={size} className={cn("flex items-center", className)}>
      {shown.map((u, i) => (
        <span
          key={u.id}
          role="img"
          aria-label={u.name}
          title={u.name}
          data-slot="avatar"
          className={cn(circle, fill, i > 0 && spec.overlap)}
        >
          {initials(u.name)}
        </span>
      ))}
      {rest.length > 0 && (
        <span
          role="img"
          aria-label={overflowLabel ? overflowLabel(rest.length) : rest.map((u) => u.name).join(", ")}
          title={rest.map((u) => u.name).join(", ")}
          data-slot="avatar-overflow"
          className={cn(circle, "bg-muted text-muted-foreground tabular-nums", spec.overlap)}
        >
          +{rest.length}
        </span>
      )}
    </span>
  );
}
