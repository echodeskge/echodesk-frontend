"use client";

/**
 * STUB (FE-09). FE-10 replaces this file: meta row, title, description,
 * checklist card, attachments card, page drop zone. See `../section-contracts.ts`.
 */
import type { DetailMainProps } from "../section-contracts";

export function DetailMain({ ticket }: DetailMainProps) {
  return (
    <div data-slot="detail-main" data-stub="fe-10" className="flex flex-col gap-2.5">
      <h2 className="px-2 text-xl font-semibold tracking-[-0.02em] lg:text-2xl">{ticket.title}</h2>
    </div>
  );
}
