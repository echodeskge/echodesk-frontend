import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatusTrack } from "@/app/(tenant)/tickets/_components/primitives";

const columns = [
  { id: 1, name: "New", color: "#3b82f6" },
  { id: 2, name: "In Progress", color: "#f59e0b" },
  { id: 3, name: "Waiting", color: "#a855f7" },
  { id: 4, name: "Resolved", color: "#22c55e" },
];
const labels = { label: "Status", moveTo: (t: string) => `Move to ${t}`, done: "Done" };

const steps = () => Array.from(document.querySelectorAll('[data-slot="status-step"]')) as HTMLButtonElement[];

describe("StatusTrack", () => {
  let scroll: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll as unknown as typeof Element.prototype.scrollIntoView;
  });

  it("done / current / future states, Check on done steps, numbers otherwise", () => {
    render(<StatusTrack columns={columns} currentColumnId={2} onMove={() => {}} labels={labels} />);
    expect(screen.getByRole("navigation", { name: "Status" })).toBeInTheDocument();
    const [s1, s2, s3, s4] = steps();
    expect(s1.dataset.state).toBe("done");
    expect(s2.dataset.state).toBe("current");
    expect(s3.dataset.state).toBe("future");
    expect(s4.dataset.state).toBe("future");
    expect(s1.querySelector('[data-slot="status-step-dot"] svg')?.getAttribute("class")).toContain("lucide-check");
    expect(s1.querySelector('[data-slot="status-step-dot"] svg')?.getAttribute("width")).toBe("10");
    expect(s1).toHaveTextContent("Done");
    expect(s2.querySelector('[data-slot="status-step-dot"]')).toHaveTextContent("2");
    expect(s3.querySelector('[data-slot="status-step-dot"]')).toHaveTextContent("3");
    expect(s2.className).toContain("font-semibold");
    expect(s2.className).toContain("bg-background");
    expect(s3.className).toContain("text-muted-foreground");
  });

  it('aria-current="step" only on the current step', () => {
    render(<StatusTrack columns={columns} currentColumnId={3} onMove={() => {}} labels={labels} />);
    expect(steps().map((s) => s.getAttribute("aria-current"))).toEqual([null, null, "step", null]);
  });

  it("the underline and filled dots use the column colour", () => {
    render(<StatusTrack columns={columns} currentColumnId={2} onMove={() => {}} labels={labels} />);
    const [s1, s2, s3] = steps();
    const underline = s2.querySelector('[data-slot="status-step-underline"]') as HTMLElement;
    expect(underline.style.background).toBe("rgb(245, 158, 11)");
    expect(underline.className).toContain("h-0.5");
    expect(s1.querySelector('[data-slot="status-step-underline"]')).toBeNull();
    expect((s1.querySelector('[data-slot="status-step-dot"]') as HTMLElement).style.background).toBe("rgb(59, 130, 246)");
    const futureDot = s3.querySelector('[data-slot="status-step-dot"]') as HTMLElement;
    expect(futureDot.style.background).toBe("");
    expect(futureDot.className).toContain("border-border");
    expect(futureDot.className).toContain("size-[18px]");
  });

  it("each step is at least 120px wide and the track scrolls (DC22)", () => {
    render(<StatusTrack columns={columns} currentColumnId={2} onMove={() => {}} labels={labels} />);
    for (const s of steps()) {
      expect(s.className).toContain("min-w-[120px]");
      expect(s.className).toContain("h-10");
      expect(s.parentElement!.className).toContain("min-w-[120px]");
    }
    expect(screen.getByRole("navigation").className).toContain("overflow-x-auto");
  });

  it("scrolls the current step into view, again when it changes", () => {
    const { rerender } = render(<StatusTrack columns={columns} currentColumnId={2} onMove={() => {}} labels={labels} />);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(steps()[1]);
    rerender(<StatusTrack columns={columns} currentColumnId={4} onMove={() => {}} labels={labels} />);
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll.mock.contexts[1]).toBe(steps()[3]);
  });

  it("onMove fires for other steps, not for the current one", () => {
    const onMove = vi.fn();
    render(<StatusTrack columns={columns} currentColumnId={2} onMove={onMove} labels={labels} />);
    fireEvent.click(screen.getByTitle("Move to Resolved"));
    expect(onMove).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByTitle("Move to In Progress"));
    expect(onMove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle("Move to New"));
    expect(onMove).toHaveBeenLastCalledWith(1);
  });

  it("disabled steps can't be clicked", () => {
    const onMove = vi.fn();
    render(<StatusTrack columns={columns} currentColumnId={2} onMove={onMove} disabledIds={[3, 4]} labels={labels} />);
    const s3 = screen.getByTitle("Move to Waiting");
    expect(s3).toBeDisabled();
    expect(s3.className).toContain("cursor-not-allowed");
    fireEvent.click(s3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("an unknown current column leaves every step in the future state", () => {
    render(<StatusTrack columns={columns} currentColumnId={99} onMove={() => {}} labels={labels} />);
    expect(steps().every((s) => s.dataset.state === "future")).toBe(true);
  });
});
