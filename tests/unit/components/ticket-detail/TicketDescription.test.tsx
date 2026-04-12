/**
 * Tests for TicketDescription click-to-edit component.
 *
 * Covers:
 * - Renders description HTML (sanitized)
 * - Clicking activates edit mode
 * - Empty description shows placeholder
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ticket } from "@/api/generated/interfaces";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "ticketDetail.noDescription": "No description provided",
      "ticketDetail.clickToEdit": "Click to edit",
      "ticketUpdatedSuccess": "Ticket updated",
      "ticketUpdatedError": "Failed to update ticket",
    };
    return translations[key] || key;
  },
}));

// Mock ticketsPartialUpdate
const mockTicketsPartialUpdate = vi.fn();
vi.mock("@/api/generated/api", () => ({
  ticketsPartialUpdate: (...args: unknown[]) => mockTicketsPartialUpdate(...args),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { TicketDescription } from "@/components/ticket-detail/TicketDescription";

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "Test Ticket",
    description: "",
    rich_description: "",
    status: "open",
    is_closed: "false",
    column: {
      id: 1,
      name: "To Do",
      board: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      created_by: "admin",
      tickets_count: 0,
    },
    position_in_column: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    created_by: { id: 1, email: "admin@test.com", first_name: "Admin", last_name: "User" } as Ticket["created_by"],
    assigned_to: { id: 2, email: "agent@test.com", first_name: "Agent", last_name: "User" } as Ticket["assigned_to"],
    assigned_users: [],
    assignments: [],
    assigned_groups: [],
    assigned_department: {} as Ticket["assigned_department"],
    tags: [],
    comments: [],
    comments_count: "0",
    checklist_items: [],
    checklist_items_count: "0",
    completed_checklist_items_count: "0",
    payments: [],
    remaining_balance: "0",
    payment_status: "unpaid",
    is_overdue: "false",
    form_submissions: "",
    attachments: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketDescription", () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders description HTML content", () => {
    const ticket = makeTicket({
      rich_description: "<p>This is the <strong>description</strong></p>",
    });
    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("This is the")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
  });

  it("shows placeholder when description is empty", () => {
    const ticket = makeTicket({ description: "", rich_description: "" });
    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("No description provided")).toBeInTheDocument();
  });

  it("shows placeholder when both description and rich_description are undefined", () => {
    const ticket = makeTicket({
      description: undefined,
      rich_description: undefined,
    });
    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("No description provided")).toBeInTheDocument();
  });

  it("clicking activates edit mode with textarea", async () => {
    const user = userEvent.setup();
    const ticket = makeTicket({
      description: "Some description text",
      rich_description: "<p>Some description text</p>",
    });

    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    // Click to enter edit mode
    await user.click(screen.getByText("Some description text"));

    // Textarea should appear
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });
  });

  it("textarea contains stripped text (no HTML) when entering edit mode", async () => {
    const user = userEvent.setup();
    const ticket = makeTicket({
      description: "Plain text",
      rich_description: "<p>Plain <strong>text</strong></p>",
    });

    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    // Click to edit
    await user.click(screen.getByText(/Plain/));

    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      // The textarea should contain stripped HTML text
      expect(textarea).toHaveValue("Plain text");
    });
  });

  it("falls back to description when rich_description is empty", () => {
    const ticket = makeTicket({
      description: "Fallback description",
      rich_description: "",
    });
    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Fallback description")).toBeInTheDocument();
  });

  it("prefers rich_description over plain description", () => {
    const ticket = makeTicket({
      description: "Plain version",
      rich_description: "<p>Rich version</p>",
    });
    render(<TicketDescription ticket={ticket} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Rich version")).toBeInTheDocument();
  });
});
