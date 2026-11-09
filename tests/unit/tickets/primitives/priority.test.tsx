import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PriorityPill, PriorityIcon } from "@/app/(tenant)/tickets/_components/primitives";
import { renderIntl } from "./render";

const CASES = [
  ["critical", "Critical", "კრიტიკული", "rgb(220, 53, 69)", "lucide-signal-high"],
  ["high", "High", null, "rgb(220, 53, 69)", "lucide-signal-high"],
  ["medium", "Medium", null, "rgb(253, 126, 20)", "lucide-signal-medium"],
  ["low", "Low", null, "rgb(40, 167, 69)", "lucide-signal-low"],
] as const;

describe("PriorityPill", () => {
  it.each(CASES)("%s: colour, tint, icon and label", (p, label, _ka, color, iconClass) => {
    const { container } = renderIntl(<PriorityPill priority={p} />);
    const pill = container.querySelector('[data-slot="priority-pill"]') as HTMLElement;
    expect(pill).toHaveTextContent(label);
    expect(pill.style.color).toBe(color);
    // 10% alpha of the same colour
    expect(pill.style.background).toBe(color.replace("rgb(", "rgba(").replace(")", ", 0.1)"));
    expect(pill.querySelector("svg")?.getAttribute("class")).toContain(iconClass);
    expect(pill.dataset.priority).toBe(p);
  });

  it("translates labels (ka)", () => {
    renderIntl(<PriorityPill priority="critical" />, "ka");
    expect(screen.getByText("კრიტიკული")).toBeInTheDocument();
  });

  it("sm is the 18px card pill, md the 22px meta pill", () => {
    const { container } = renderIntl(
      <>
        <PriorityPill priority="high" />
        <PriorityPill priority="high" size="md" />
      </>,
    );
    const [sm, md] = Array.from(container.querySelectorAll('[data-slot="priority-pill"]'));
    expect(sm.className).toContain("h-[18px]");
    expect(sm.className).toContain("text-[11px]");
    expect(md.className).toContain("h-[22px]");
    expect(md.className).toContain("font-semibold");
    expect(sm.querySelector("svg")?.getAttribute("width")).toBe("11");
    expect(md.querySelector("svg")?.getAttribute("width")).toBe("12");
  });

  it("falls back to grey for unknown values (no 'urgent')", () => {
    const { container } = renderIntl(<PriorityPill priority="urgent" />);
    const pill = container.querySelector('[data-slot="priority-pill"]') as HTMLElement;
    expect(pill.dataset.priority).toBe("unknown");
    expect(pill.style.color).toBe("rgb(108, 117, 125)");
  });
});

describe("PriorityIcon", () => {
  it("is a labelled image in the priority colour", () => {
    renderIntl(<PriorityIcon priority="medium" />);
    const icon = screen.getByRole("img", { name: "Medium" });
    expect(icon.style.color).toBe("rgb(253, 126, 20)");
    expect(icon.querySelector("svg")?.getAttribute("width")).toBe("15");
  });
});
