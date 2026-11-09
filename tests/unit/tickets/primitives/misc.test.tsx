import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import {
  CardSkeleton,
  DetailSkeleton,
  EmptyState,
  RowSkeleton,
  SectionLabel,
  SKELETON_HEIGHTS,
  VDivider,
} from "@/app/(tenant)/tickets/_components/primitives";

describe("SectionLabel", () => {
  it("is 11/500 uppercase with .04em tracking", () => {
    render(<SectionLabel>Views</SectionLabel>);
    const el = screen.getByText("Views");
    expect(el.tagName).toBe("SPAN");
    for (const c of ["text-[11px]", "font-medium", "uppercase", "tracking-[.04em]", "text-muted-foreground"]) {
      expect(el.className).toContain(c);
    }
  });

  it("can render as another element", () => {
    render(<SectionLabel as="h3">Customer</SectionLabel>);
    expect(screen.getByRole("heading", { name: "Customer" })).toBeInTheDocument();
  });
});

describe("VDivider", () => {
  it("is a decorative 16px rule with 4px or 6px spacing", () => {
    const { container } = render(
      <>
        <VDivider />
        <VDivider spacing={6} />
      </>,
    );
    const [a, b] = Array.from(container.querySelectorAll('[data-slot="v-divider"]'));
    expect(a).toHaveAttribute("aria-hidden", "true");
    expect(a.className).toContain("h-4");
    expect(a.className).toContain("w-px");
    expect(a.className).toContain("mx-1");
    expect(b.className).toContain("mx-1.5");
  });
});

describe("EmptyState", () => {
  it("renders icon, title, description and action", () => {
    render(<EmptyState icon={Inbox} title="This board has no columns" description="Add one" action={<button>Add column</button>} />);
    expect(screen.getByText("This board has no columns")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add column" })).toBeInTheDocument();
  });

  it("is text-only without an action (DC39)", () => {
    render(<EmptyState icon={Inbox} title="No tickets" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("skeletons", () => {
  it("card skeleton matches the 86px card (one-line title)", () => {
    const { container } = render(<CardSkeleton />);
    const el = container.firstElementChild!;
    expect(SKELETON_HEIGHTS.card).toBe(1 + 8 + 18 + 6 + 18 + 6 + 20 + 8 + 1);
    expect(el.className).toContain(`h-[${SKELETON_HEIGHTS.card}px]`);
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("px-2.5");
    expect(el.className).toContain("py-2");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("row skeleton matches the 40px list row and its grid", () => {
    const { container } = render(<RowSkeleton />);
    const el = container.firstElementChild!;
    expect(SKELETON_HEIGHTS.row).toBe(40);
    expect(el.className).toContain("h-10");
    expect(el.className).toContain("md:grid-cols-[36px_64px_minmax(0,1fr)_200px_90px_56px_90px]");
  });

  it("detail skeleton has the 41px track and the 300px rail", () => {
    const { container } = render(<DetailSkeleton />);
    expect(container.querySelector(".h-\\[41px\\]")).not.toBeNull();
    expect(container.querySelector(".md\\:w-\\[300px\\]")).not.toBeNull();
  });
});
