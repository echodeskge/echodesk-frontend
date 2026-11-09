"use client";

/**
 * STUB (FE-09). FE-11 replaces this file: the sticky composer bar (avatar,
 * internal toggle, Attach, Mention, Saved reply, ⌘↵ hint, Post). It owns the
 * bar's border-top, background and padding. See `../section-contracts.ts`.
 */
import type { ComposerProps } from "../section-contracts";

export function Composer({ ticket }: ComposerProps) {
  return <div data-slot="composer" data-stub="fe-11" data-ticket-id={ticket.id} />;
}
