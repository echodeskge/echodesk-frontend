import { describe, it, expect, vi, beforeAll } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  PICKER_POPOVER,
  PROPERTY_LABEL_WIDTH,
  PropertyPicker,
  PropertyRow,
  type PickerOption,
} from "@/app/(tenant)/tickets/_components/primitives";

beforeAll(() => {
  // cmdk scrolls the highlighted item into view; jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
});

const STATUS: PickerOption<number>[] = [
  { value: 1, label: "New", color: "#3b82f6" },
  { value: 2, label: "In Progress", color: "#f59e0b" },
  { value: 3, label: "Resolved", color: "#22c55e" },
];

const USERS: PickerOption<number>[] = [
  { value: 10, label: "Nino Beridze", avatarName: "Nino Beridze" },
  { value: 11, label: "Giorgi Kapanadze", avatarName: "Giorgi Kapanadze" },
  { value: 12, label: "ნინო ბერიძე", avatarName: "ნინო ბერიძე" },
];

function Single({ onChange = vi.fn(), disabled = false }: { onChange?: (v: number) => void; disabled?: boolean }) {
  const [value, setValue] = useState<number | null>(2);
  return (
    <>
      <PropertyRow label="Status">
        <PropertyPicker
          options={STATUS}
          value={value}
          placeholder="Empty"
          disabled={disabled}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      </PropertyRow>
      <button>outside</button>
    </>
  );
}

function Multi({ onChange = vi.fn(), footer }: { onChange?: (v: number[]) => void; footer?: React.ReactNode }) {
  const [value, setValue] = useState<number[]>([10]);
  return (
    <PropertyRow label="Assignees">
      <PropertyPicker
        multi
        options={USERS}
        value={value}
        placeholder="Unassigned"
        footer={footer}
        selectedLabel="selected"
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    </PropertyRow>
  );
}

const trigger = () => document.querySelector('[data-slot="property-picker-trigger"]') as HTMLButtonElement;
const options = () => Array.from(document.querySelectorAll('[data-slot="property-picker-option"]')) as HTMLElement[];

describe("PropertyRow", () => {
  it("grid 92px minmax(0,1fr), min-height 38, 7px padding (D177)", () => {
    const { container } = render(<PropertyRow label="Status">x</PropertyRow>);
    const row = container.querySelector('[data-slot="property-row"]')!;
    expect(row.className).toContain("grid-cols-[92px_minmax(0,1fr)]");
    expect(row.className).toContain("min-h-[38px]");
    expect(row.className).toContain("py-[7px]");
    expect(row.className).toContain("gap-2");
    expect(PROPERTY_LABEL_WIDTH).toBe(92);
    expect(screen.getByText("Status").className).toContain("text-xs");
  });

  it("fixed rows use 9px padding and 12px text (D186)", () => {
    const { container } = render(
      <PropertyRow label="Reporter" fixed>
        Nino
      </PropertyRow>,
    );
    const row = container.querySelector('[data-slot="property-row"]')!;
    expect(row.className).toContain("py-[9px]");
    expect(row.className).toContain("text-xs");
    expect(row.className).not.toContain("min-h-[38px]");
  });
});

describe("PropertyPicker", () => {
  it("trigger shows 20px radius-full pills with the row label as its name", () => {
    render(<Single />);
    const t = trigger();
    expect(t).toHaveAccessibleName(/Status/);
    expect(t).toHaveAccessibleName(/In Progress/);
    expect(t.className).toContain("min-h-[26px]");
    expect(t.className).toContain("-ml-1.5");
    const pill = t.querySelector('[data-slot="property-pill"]')!;
    expect(pill.className).toContain("h-5");
    expect(pill.className).toContain("rounded-full");
    expect(pill.className).toContain("bg-muted");
  });

  it("shows the placeholder when nothing is selected", () => {
    render(<PropertyPicker options={STATUS} value={null} placeholder="Empty" onChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Empty");
  });

  it("opens 30px options with Check 14 on the selected one, offset to the label edge (DC34)", async () => {
    render(<Single />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    for (const o of options()) {
      expect(o.className).toContain("h-[30px]");
      expect(o.className).toContain("text-[13px]");
    }
    const active = options().find((o) => o.dataset.active === "true")!;
    expect(active).toHaveTextContent("In Progress");
    const check = active.querySelector('[data-slot="property-picker-check"]')!;
    expect(check.getAttribute("width")).toBe("14");
    expect(options().filter((o) => o.querySelector('[data-slot="property-picker-check"]'))).toHaveLength(1);

    const content = document.querySelector('[data-slot="property-picker-content"]')!;
    expect(content.className).toContain(PICKER_POPOVER.widthClass);
    expect(content.className).toContain("shadow-popover-lg");
    expect(content.className).toContain("rounded-lg");
    // left:92px from the row = trigger start (94px) - 2; 4px under the trigger.
    expect(PICKER_POPOVER).toMatchObject({ align: "start", alignOffset: -2, sideOffset: 4 });
    expect(trigger()).toHaveAttribute("data-state", "open");
    expect(trigger().className).toContain("border-ring");
  });

  it("single: picking an option calls onChange and closes", async () => {
    const onChange = vi.fn();
    render(<Single onChange={onChange} />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.click(screen.getByText("Resolved"));
    expect(onChange).toHaveBeenCalledWith(3);
    await waitFor(() => expect(options()).toHaveLength(0));
    expect(trigger()).toHaveTextContent("Resolved");
  });

  it("keyboard: arrows move the highlight, Enter picks", async () => {
    const onChange = vi.fn();
    render(<Single onChange={onChange} />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    const root = document.querySelector("[cmdk-root]") as HTMLElement;
    await waitFor(() => expect(document.activeElement).toBe(root));
    // cmdk highlights the first option on open
    await waitFor(() => expect(options()[0]).toHaveAttribute("data-selected", "true"));
    fireEvent.keyDown(root, { key: "ArrowDown" });
    fireEvent.keyDown(root, { key: "ArrowDown" });
    expect(options()[2]).toHaveAttribute("data-selected", "true");
    fireEvent.keyDown(root, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("multi: toggles values and stays open", async () => {
    const onChange = vi.fn();
    render(<Multi onChange={onChange} />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.click(screen.getByText("Giorgi Kapanadze", { selector: "[data-slot=property-picker-option] span" }));
    expect(onChange).toHaveBeenLastCalledWith([10, 11]);
    expect(options()).toHaveLength(3);
    const active = options().filter((o) => o.dataset.active === "true");
    expect(active).toHaveLength(2);
    expect(active[0]).toHaveTextContent("selected");
    // toggle off
    fireEvent.click(screen.getByText("Nino Beridze", { selector: "[data-slot=property-picker-option] span" }));
    expect(onChange).toHaveBeenLastCalledWith([11]);
  });

  it("user options and pills show Georgian-safe initials", async () => {
    render(<Multi />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    expect(options()[2]).toHaveTextContent("ნბ");
    expect(trigger().querySelector('[data-slot="property-pill-avatar"]')).toHaveTextContent("NB");
    expect(trigger().querySelector('[data-slot="property-pill-avatar"]')!.className).toContain("size-3.5");
  });

  it("renders the footer below the options", async () => {
    render(<Multi footer={<button>Manage labels…</button>} />);
    fireEvent.click(trigger());
    await waitFor(() => expect(screen.getByRole("button", { name: "Manage labels…" })).toBeInTheDocument());
    expect(document.querySelector('[data-slot="property-picker-footer"]')).not.toBeNull();
  });

  it("closes on outside click and Escape", async () => {
    render(<Single />);
    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(options()).toHaveLength(0));

    fireEvent.click(trigger());
    await waitFor(() => expect(options()).toHaveLength(3));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(options()).toHaveLength(0));
  });

  it("disabled: no popover, no hover styles", () => {
    render(<Single disabled />);
    const t = trigger();
    expect(t).toBeDisabled();
    expect(t.className).not.toContain("hover:bg-muted/40");
    fireEvent.click(t);
    expect(options()).toHaveLength(0);
    expect(t).toHaveTextContent("In Progress");
  });

  it("search box appears for long lists and filters", async () => {
    const many: PickerOption<number>[] = Array.from({ length: 10 }, (_, i) => ({ value: i, label: `Option ${i}` }));
    render(
      <PropertyPicker
        options={many}
        value={null}
        placeholder="Empty"
        searchPlaceholder="Search"
        emptyText="No results"
        onChange={() => {}}
      />,
    );
    fireEvent.click(trigger());
    const input = await screen.findByPlaceholderText("Search");
    fireEvent.change(input, { target: { value: "Option 7" } });
    await waitFor(() => expect(options()).toHaveLength(1));
    fireEvent.change(input, { target: { value: "zzz" } });
    await waitFor(() => expect(screen.getByText("No results")).toBeInTheDocument());
  });
});
