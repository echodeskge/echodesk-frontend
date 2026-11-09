import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CollapsibleCard } from "@/app/(tenant)/tickets/_components/primitives";

describe("CollapsibleCard", () => {
  it("toggles the body with aria-expanded", () => {
    render(
      <CollapsibleCard title="Checklist" summary="2/4" defaultOpen>
        <p>items</p>
      </CollapsibleCard>,
    );
    const toggle = screen.getByRole("button", { name: /Checklist/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("items")).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("items")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("items")).toBeInTheDocument();
  });

  it("starts collapsed by default", () => {
    render(
      <CollapsibleCard title="Attachments">
        <p>files</p>
      </CollapsibleCard>,
    );
    expect(screen.getByRole("button", { name: /Attachments/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("files")).toBeNull();
  });

  it("radius 10, 44px header with the muted/0.4 hover, rotating chevron (DC25)", () => {
    const { container } = render(
      <CollapsibleCard title="Checklist" defaultOpen>
        x
      </CollapsibleCard>,
    );
    const card = container.querySelector('[data-slot="collapsible-card"]')!;
    expect(card.className).toContain("rounded-[10px]");
    const header = container.querySelector('[data-slot="collapsible-card-header"]')!;
    expect(header.className).toContain("h-11");
    expect(header.className).toContain("hover:bg-muted/40");
    const chevron = container.querySelector('[data-slot="collapsible-card-chevron"]')!;
    expect(chevron.className).toContain("transition-transform");
    expect(chevron.className).toContain("duration-150");
    expect(chevron.className).toContain("rotate-90");
    fireEvent.click(screen.getByRole("button"));
    expect(chevron.className).toContain("rotate-0");
    expect(chevron.className).not.toContain("rotate-90");
  });

  it("renders the action outside the toggle button", () => {
    const onUpload = vi.fn();
    render(
      <CollapsibleCard title="Attachments" action={<button onClick={onUpload}>Upload</button>}>
        x
      </CollapsibleCard>,
    );
    const upload = screen.getByRole("button", { name: "Upload" });
    const toggle = screen.getByRole("button", { name: /Attachments/ });
    expect(toggle.contains(upload)).toBe(false);
    fireEvent.click(upload);
    expect(onUpload).toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("supports controlled mode", () => {
    const onOpenChange = vi.fn();
    render(
      <CollapsibleCard title="Files" open={false} onOpenChange={onOpenChange}>
        x
      </CollapsibleCard>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });
});
