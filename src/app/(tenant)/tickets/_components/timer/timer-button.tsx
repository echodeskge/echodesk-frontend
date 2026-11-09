"use client";

/**
 * STUB (FE-09). FE-13 replaces this file: the header timer button (Play/Pause
 * + mono elapsed time; idle shows my total, "00:00:00" at zero, DC21) and the
 * switch dialog. It renders inside the app header slot: route intl messages
 * and react-query are available there, the tickets realtime context is not.
 * See `[id]/_components/section-contracts.ts`.
 */
import { Play } from "lucide-react";
import { formatTimer } from "../../_lib/format";
import type { TimerSectionProps } from "../../[id]/_components/section-contracts";

export function TimerButton({ ticketId }: TimerSectionProps) {
  return (
    <span
      data-slot="timer-button"
      data-stub="fe-13"
      data-ticket-id={ticketId}
      aria-hidden="true"
      className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium text-muted-foreground"
    >
      <Play size={13} />
      <span className="font-mono tabular-nums">{formatTimer(0)}</span>
    </span>
  );
}
