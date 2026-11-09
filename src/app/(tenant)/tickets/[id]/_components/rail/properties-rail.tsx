"use client";

/**
 * STUB (FE-09). FE-12 replaces this file: the picker rows (Status, Priority,
 * Assignees, Groups, Labels, Department, Board, Customer, Due date), the fixed
 * rows (Time = FE-13's `<TimeRow/>`, Reporter, Created), the Payment block,
 * the Customer and Forms sections. See `../section-contracts.ts`.
 */
import type { PropertiesRailProps } from "../section-contracts";

export function PropertiesRail({ ticket }: PropertiesRailProps) {
  return <div data-slot="properties-rail" data-stub="fe-12" data-ticket-id={ticket.id} className="flex flex-col px-3 py-2" />;
}
