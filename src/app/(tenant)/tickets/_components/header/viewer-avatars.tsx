"use client";

/**
 * People viewing the board: 24px initials avatars on `background`, −6px
 * overlap, desktop only (hidden below `md`). The tooltip is the already
 * translated ICU plural ("3 people are viewing"). Header slot content: props only.
 */
import { AvatarStack, type AvatarStackUser } from "../primitives/avatar-stack";

export interface ViewerAvatarsProps {
  viewers: AvatarStackUser[];
  /** Already-translated tooltip, e.g. `tickets.presence.viewing` with the count. */
  label: string;
  max?: number;
}

export function ViewerAvatars({ viewers, label, max = 3 }: ViewerAvatarsProps) {
  if (viewers.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={label}
      title={label}
      data-testid="board-viewers"
      className="mr-1.5 hidden items-center pl-1.5 md:flex"
    >
      <AvatarStack users={viewers} size={24} max={max} ringColor="background" tone="muted" />
    </div>
  );
}
