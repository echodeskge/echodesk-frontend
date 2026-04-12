/**
 * Tests for TicketMetadataField inline-edit component.
 *
 * Covers:
 * - Renders label and value
 * - Clicking value shows editing control
 * - Clicking outside closes editing
 * - selfManaged mode doesn't toggle on click
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketMetadataField } from "@/components/ticket-detail/TicketMetadataField";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketMetadataField", () => {
  it("renders label and value", () => {
    render(
      <TicketMetadataField label="Status">
        <span>Open</span>
      </TicketMetadataField>
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("clicking value toggles edit mode when editing control is provided", async () => {
    const user = userEvent.setup();

    render(
      <TicketMetadataField
        label="Priority"
        editing={<select data-testid="priority-select"><option>High</option></select>}
      >
        <span>Medium</span>
      </TicketMetadataField>
    );

    // Initially shows the value
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.queryByTestId("priority-select")).not.toBeInTheDocument();

    // Click the value to enter edit mode
    await user.click(screen.getByText("Medium"));

    // Now shows the editing control
    expect(screen.getByTestId("priority-select")).toBeInTheDocument();
  });

  it("does not toggle edit mode when no editing prop is provided", async () => {
    const user = userEvent.setup();

    render(
      <TicketMetadataField label="Created">
        <span>2024-01-01</span>
      </TicketMetadataField>
    );

    await user.click(screen.getByText("2024-01-01"));

    // No editing control should appear since none was provided
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
  });

  it("clicking outside closes the editing control", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <TicketMetadataField
          label="Priority"
          editing={<input data-testid="edit-input" defaultValue="High" />}
        >
          <span>Medium</span>
        </TicketMetadataField>
      </div>
    );

    // Enter edit mode
    await user.click(screen.getByText("Medium"));
    expect(screen.getByTestId("edit-input")).toBeInTheDocument();

    // Click outside the field
    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByTestId("edit-input")).not.toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });
  });

  it("selfManaged mode renders children directly without toggle behavior", async () => {
    const user = userEvent.setup();

    render(
      <TicketMetadataField
        label="Assigned To"
        selfManaged
        editing={<input data-testid="should-not-appear" />}
      >
        <button data-testid="custom-select">Select User</button>
      </TicketMetadataField>
    );

    // The children are rendered
    expect(screen.getByTestId("custom-select")).toBeInTheDocument();
    expect(screen.getByText("Assigned To")).toBeInTheDocument();

    // Clicking does NOT activate the editing prop
    await user.click(screen.getByTestId("custom-select"));

    // The editing control should NOT appear
    expect(screen.queryByTestId("should-not-appear")).not.toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <TicketMetadataField label="Test" className="custom-class">
        <span>Value</span>
      </TicketMetadataField>
    );

    // The outer wrapper should have the custom class
    const wrapper = container.firstElementChild;
    expect(wrapper?.classList.contains("custom-class")).toBe(true);
  });
});
