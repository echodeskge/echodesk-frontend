import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { ChecklistCount, DueChip } from "@/app/(tenant)/tickets/_components/primitives";
import { renderIntl } from "./render";

// Dates are fixed strings far in the past/future relative to each other; the
// component never compares them with "today" (the server sends is_overdue_task),
// so these tests don't depend on the clock. Year 2031 is shown as-is when it
// differs from the current year, so only the month/day part is asserted.

describe("DueChip", () => {
  it("not overdue: calendar icon and the date, muted", () => {
    const { container } = renderIntl(<DueChip date="2031-11-12" overdue={false} />);
    const chip = container.querySelector('[data-slot="due-chip"]') as HTMLElement;
    expect(chip).toHaveTextContent(/Nov 12/);
    expect(chip.className).toContain("text-muted-foreground");
    expect(chip.querySelector("svg")?.getAttribute("class")).toContain("lucide-calendar");
    expect(chip.getAttribute("aria-label")).toMatch(/^Due Nov 12/);
  });

  it("overdue: red with AlertCircle and the 'Overdue' text, not colour alone (RM7)", () => {
    const { container } = renderIntl(<DueChip date="2020-03-01" overdue />);
    const chip = container.querySelector('[data-slot="due-chip"]') as HTMLElement;
    expect(chip.className).toContain("text-destructive");
    expect(chip.querySelector("svg")?.getAttribute("class")).toMatch(/lucide-(alert-circle|circle-alert)/);
    expect(chip).toHaveTextContent("Overdue");
    expect(chip).toHaveTextContent("Mar 1, 2020");
    expect(chip.getAttribute("aria-label")).toBe("Overdue · Due Mar 1, 2020");
  });

  it("compact overdue drops the visible date but keeps it in the label", () => {
    const { container } = renderIntl(<DueChip date="2020-03-01" overdue compact />);
    const chip = container.querySelector('[data-slot="due-chip"]') as HTMLElement;
    expect(chip.textContent).toBe("Overdue");
    expect(chip.getAttribute("title")).toContain("Mar 1, 2020");
  });

  it("parses the date-only string as a local calendar day (RM6)", () => {
    const { container } = renderIntl(<DueChip date="2031-01-01" overdue={false} />);
    expect(container.querySelector('[data-slot="due-chip"]')).toHaveTextContent(/Jan 1/);
  });

  it("Georgian month names", () => {
    renderIntl(<DueChip date="2020-11-05" overdue />, "ka");
    expect(screen.getByText(/5 ნოე 2020/)).toBeInTheDocument();
  });

  it("renders nothing without a valid date", () => {
    const { container } = renderIntl(<DueChip date={null} overdue={false} />);
    expect(container.querySelector('[data-slot="due-chip"]')).toBeNull();
  });
});

describe("ChecklistCount", () => {
  it("shows n/m with an accessible label", () => {
    renderIntl(<ChecklistCount done={2} total={5} />);
    const el = screen.getByLabelText("Checklist: 2 of 5 done");
    expect(el).toHaveTextContent("2/5");
    expect(el.dataset.complete).toBe("false");
  });

  it("complete is green", () => {
    renderIntl(<ChecklistCount done={3} total={3} />);
    expect(screen.getByLabelText("Checklist: 3 of 3 done").className).toContain("text-green");
  });

  it("hidden without a checklist", () => {
    const { container } = renderIntl(<ChecklistCount done={0} total={0} />);
    expect(container.querySelector('[data-slot="checklist-count"]')).toBeNull();
  });
});
