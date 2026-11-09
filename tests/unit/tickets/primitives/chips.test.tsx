import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { UserRound } from "lucide-react";
import {
  ColorDot,
  FilterChip,
  LabelChip,
  LabelChips,
  ViewSegment,
} from "@/app/(tenant)/tickets/_components/primitives";
import { renderIntl } from "./render";

describe("FilterChip", () => {
  it("inactive: dashed, transparent, trailing Plus, no value", () => {
    const onClick = vi.fn();
    renderIntl(<FilterChip icon={UserRound} label="Assignee" valueLabel="Me" active={false} onClick={onClick} />);
    const chip = screen.getByRole("button", { name: /Assignee/ });
    expect(chip.className).toContain("border-dashed");
    expect(chip.className).toContain("bg-transparent");
    expect(chip.querySelector('[data-slot="filter-chip-plus"]')).not.toBeNull();
    expect(chip.querySelector('[data-slot="filter-chip-value"]')).toBeNull();
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("active: solid accent, value after the divider, no Plus", () => {
    renderIntl(<FilterChip icon={UserRound} label="Assignee" valueLabel="Me" active />);
    const chip = screen.getByRole("button", { name: /Assignee/ });
    expect(chip.className).toContain("border-solid");
    expect(chip.className).toContain("bg-accent");
    const value = chip.querySelector('[data-slot="filter-chip-value"]')!;
    expect(value).toHaveTextContent("Me");
    expect(value.className).toContain("border-l");
    expect(chip.querySelector('[data-slot="filter-chip-plus"]')).toBeNull();
  });

  it('shows "first +n" when extraCount is set (DC4)', () => {
    renderIntl(<FilterChip icon={UserRound} label="Assignee" valueLabel="Me" extraCount={2} active />);
    expect(screen.getByText("Me +2")).toBeInTheDocument();
  });

  it("is 28px with a 13px icon", () => {
    renderIntl(<FilterChip icon={UserRound} label="Assignee" active={false} />);
    const chip = screen.getByRole("button");
    expect(chip.className).toContain("h-7");
    expect(chip.querySelector("svg")?.getAttribute("width")).toBe("13");
  });
});

describe("LabelChip / LabelChips", () => {
  const labels = [
    { id: 1, name: "Login", color: "#8b5cf6" },
    { id: 2, name: "PBX", color: "#ef4444" },
    { id: 3, name: "Billing", color: "#0ea5e9" },
    { id: 4, name: "VIP", color: "#22c55e" },
    { id: 5, name: "Bug", color: "#f59e0b" },
  ];

  it("renders the name with a 6px dot in the label colour", () => {
    const { container } = renderIntl(<LabelChip name="Login" color="#8b5cf6" />);
    const dot = container.querySelector('[data-slot="color-dot"]') as HTMLElement;
    expect(dot.className).toContain("size-1.5");
    expect(dot.style.background).toBe("rgb(139, 92, 246)");
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("sizes: sm 18px, md 22px, list 20px", () => {
    const { container } = renderIntl(
      <>
        <LabelChip name="a" size="sm" />
        <LabelChip name="b" size="md" />
        <LabelChip name="c" size="list" />
      </>,
    );
    const [sm, md, list] = Array.from(container.querySelectorAll('[data-slot="label-chip"]'));
    expect(sm.className).toContain("h-[18px]");
    expect(md.className).toContain("h-[22px]");
    expect(list.className).toContain("h-5");
  });

  it("shows at most 3, then +n with the rest in the tooltip (DC16)", () => {
    const { container } = renderIntl(<LabelChips labels={labels} />);
    expect(container.querySelectorAll('[data-slot="label-chip"]')).toHaveLength(3);
    const more = container.querySelector('[data-slot="label-chips-more"]')!;
    expect(more).toHaveTextContent("+2");
    expect(more).toHaveAttribute("title", "VIP, Bug");
  });

  it("no +n when within max; nothing for no labels", () => {
    const { container } = renderIntl(<LabelChips labels={labels.slice(0, 3)} />);
    expect(container.querySelector('[data-slot="label-chips-more"]')).toBeNull();
    const empty = renderIntl(<LabelChips labels={[]} />);
    expect(empty.container.querySelector('[data-slot="label-chips"]')).toBeNull();
  });
});

describe("ColorDot", () => {
  it("is decorative and sized", () => {
    const { container } = renderIntl(<ColorDot color="#3b82f6" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot.className).toContain("size-2");
    expect(dot.style.background).toBe("rgb(59, 130, 246)");
  });
});

describe("ViewSegment", () => {
  const labels = { board: "Board", list: "List" };

  it("marks the active segment and changes on click", () => {
    const onChange = vi.fn();
    renderIntl(<ViewSegment value="board" onChange={onChange} labels={labels} ariaLabel="View" />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    const board = screen.getByRole("radio", { name: "Board" });
    expect(board).toHaveAttribute("aria-checked", "true");
    expect(board.className).toContain("bg-background");
    fireEvent.click(screen.getByRole("radio", { name: "List" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("arrow keys move the selection", () => {
    const onChange = vi.fn();
    renderIntl(<ViewSegment value="board" onChange={onChange} labels={labels} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Board" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("list");
  });

  it("hides options (List while the flag is off, DC3)", () => {
    renderIntl(<ViewSegment value="board" onChange={() => {}} labels={labels} hidden={["list"]} />);
    expect(screen.queryByRole("radio", { name: "List" })).toBeNull();
    expect(screen.getByRole("radio", { name: "Board" })).toBeInTheDocument();
  });
});
