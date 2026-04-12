/**
 * Tests for ticket status and priority display logic.
 *
 * Extracts and tests the pure functions used across the codebase for:
 * - Priority colors mapping (critical -> red, high -> orange, medium -> yellow, low -> green)
 * - Kanban priority colors (high/urgent -> red, medium/normal -> orange, low -> green)
 * - Overdue detection (payment_due_date vs now)
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Extracted from TicketDetail.tsx (inline function)
// ---------------------------------------------------------------------------

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "#e74c3c";
    case "high":
      return "#e67e22";
    case "medium":
      return "#f39c12";
    case "low":
      return "#27ae60";
    default:
      return "#95a5a6";
  }
}

// ---------------------------------------------------------------------------
// Extracted from kanban-task-item-header.tsx
// ---------------------------------------------------------------------------

function getKanbanPriorityColor(priority: string): string {
  const priorityLower = priority.toLowerCase();
  switch (priorityLower) {
    case "high":
    case "urgent":
      return "#dc3545"; // red
    case "medium":
    case "normal":
      return "#fd7e14"; // orange
    case "low":
      return "#28a745"; // green
    default:
      return "#6c757d"; // gray
  }
}

// ---------------------------------------------------------------------------
// Overdue detection logic (from Ticket interface: payment_due_date + is_overdue)
// ---------------------------------------------------------------------------

function isTicketOverdue(paymentDueDate: string | undefined, now: Date): boolean {
  if (!paymentDueDate) return false;
  const dueDate = new Date(paymentDueDate);
  return now > dueDate;
}

// ---------------------------------------------------------------------------
// Tests: Priority Colors (TicketDetail)
// ---------------------------------------------------------------------------

describe("Ticket Priority Colors (TicketDetail)", () => {
  it("critical -> red (#e74c3c)", () => {
    expect(getPriorityColor("critical")).toBe("#e74c3c");
  });

  it("high -> orange (#e67e22)", () => {
    expect(getPriorityColor("high")).toBe("#e67e22");
  });

  it("medium -> yellow-orange (#f39c12)", () => {
    expect(getPriorityColor("medium")).toBe("#f39c12");
  });

  it("low -> green (#27ae60)", () => {
    expect(getPriorityColor("low")).toBe("#27ae60");
  });

  it("unknown priority -> gray (#95a5a6)", () => {
    expect(getPriorityColor("unknown")).toBe("#95a5a6");
  });

  it("empty string -> gray (#95a5a6)", () => {
    expect(getPriorityColor("")).toBe("#95a5a6");
  });
});

// ---------------------------------------------------------------------------
// Tests: Priority Colors (Kanban)
// ---------------------------------------------------------------------------

describe("Kanban Priority Colors", () => {
  it("high -> red (#dc3545)", () => {
    expect(getKanbanPriorityColor("high")).toBe("#dc3545");
  });

  it("urgent -> red (#dc3545)", () => {
    expect(getKanbanPriorityColor("urgent")).toBe("#dc3545");
  });

  it("medium -> orange (#fd7e14)", () => {
    expect(getKanbanPriorityColor("medium")).toBe("#fd7e14");
  });

  it("normal -> orange (#fd7e14)", () => {
    expect(getKanbanPriorityColor("normal")).toBe("#fd7e14");
  });

  it("low -> green (#28a745)", () => {
    expect(getKanbanPriorityColor("low")).toBe("#28a745");
  });

  it("unknown priority -> gray (#6c757d)", () => {
    expect(getKanbanPriorityColor("unknown")).toBe("#6c757d");
  });

  it("is case-insensitive", () => {
    expect(getKanbanPriorityColor("HIGH")).toBe("#dc3545");
    expect(getKanbanPriorityColor("Medium")).toBe("#fd7e14");
    expect(getKanbanPriorityColor("LOW")).toBe("#28a745");
  });
});

// ---------------------------------------------------------------------------
// Tests: Overdue Detection
// ---------------------------------------------------------------------------

describe("Ticket Overdue Detection", () => {
  it("returns false when no payment_due_date", () => {
    expect(isTicketOverdue(undefined, new Date())).toBe(false);
  });

  it("returns false when payment_due_date is empty string", () => {
    expect(isTicketOverdue("", new Date())).toBe(false);
  });

  it("returns true when current time is past due date", () => {
    const pastDue = "2024-01-01T00:00:00Z";
    const now = new Date("2024-06-01T00:00:00Z");
    expect(isTicketOverdue(pastDue, now)).toBe(true);
  });

  it("returns false when current time is before due date", () => {
    const futureDue = "2025-12-31T00:00:00Z";
    const now = new Date("2024-06-01T00:00:00Z");
    expect(isTicketOverdue(futureDue, now)).toBe(false);
  });

  it("returns false when current time exactly equals due date", () => {
    const dueDate = "2024-06-01T12:00:00Z";
    const now = new Date("2024-06-01T12:00:00Z");
    // now > dueDate is false when equal
    expect(isTicketOverdue(dueDate, now)).toBe(false);
  });

  it("returns true one second after due date", () => {
    const dueDate = "2024-06-01T12:00:00Z";
    const now = new Date("2024-06-01T12:00:01Z");
    expect(isTicketOverdue(dueDate, now)).toBe(true);
  });
});
