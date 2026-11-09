"use client";

/**
 * STUB (FE-09). FE-13 replaces this file: the activity feed's Time tab
 * (logged time entries + time in status). Rendered by FE-11's ActivityFeed.
 */
import type { TimerSectionProps } from "../../[id]/_components/section-contracts";

export function TimeTab({ ticketId }: TimerSectionProps) {
  return <div data-slot="time-tab" data-stub="fe-13" data-ticket-id={ticketId} />;
}
