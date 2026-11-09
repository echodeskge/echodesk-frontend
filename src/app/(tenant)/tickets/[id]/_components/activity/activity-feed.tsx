"use client";

/**
 * STUB (FE-09). FE-11 replaces this file: Activity title, All / Comments /
 * History / Time tabs (the Time tab renders FE-13's `<TimeTab/>`), "Updated
 * {relative}", the timeline. See `../section-contracts.ts`.
 */
import type { ActivityFeedProps } from "../section-contracts";

export function ActivityFeed({ ticketId }: ActivityFeedProps) {
  return <section data-slot="activity-feed" data-stub="fe-11" data-ticket-id={ticketId} className="min-h-10" />;
}
