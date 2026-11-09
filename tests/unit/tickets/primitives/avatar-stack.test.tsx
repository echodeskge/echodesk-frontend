import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarStack, initials } from "@/app/(tenant)/tickets/_components/primitives";

const users = [
  { id: 1, name: "Nino Beridze" },
  { id: 2, name: "Giorgi Kapanadze" },
  { id: 3, name: "Levan Maisuradze" },
  { id: 4, name: "Ana Lomidze" },
  { id: 5, name: "Mari Tsiklauri" },
];

describe("initials", () => {
  it("takes the first letters of two words", () => {
    expect(initials("Nino Beridze")).toBe("NB");
    expect(initials("nino")).toBe("N");
    expect(initials("nino.beridze@demo.ge")).toBe("NB");
    expect(initials("")).toBe("?");
  });

  it("keeps Georgian letters as Mkhedruli (no Mtavruli upper-casing)", () => {
    expect(initials("ნინო ბერიძე")).toBe("ნბ");
    const cp = initials("ნინო ბერიძე").codePointAt(0)!;
    expect(cp >= 0x10d0 && cp <= 0x10ff).toBe(true); // Mkhedruli, not Mtavruli (U+1C90..)
    expect(initials("ლევან")).toBe("ლ");
  });
});

describe("AvatarStack", () => {
  it("shows max avatars and a +n overflow listing the rest", () => {
    render(<AvatarStack users={users} max={3} />);
    expect(screen.getAllByRole("img").filter((e) => e.dataset.slot === "avatar")).toHaveLength(3);
    const more = screen.getByText("+2");
    expect(more.dataset.slot).toBe("avatar-overflow");
    expect(more).toHaveAttribute("title", "Ana Lomidze, Mari Tsiklauri");
  });

  it("uses overflowLabel for the +n accessible name", () => {
    render(<AvatarStack users={users} max={3} overflowLabel={(n) => `${n} more`} />);
    expect(screen.getByRole("img", { name: "2 more" })).toHaveTextContent("+2");
  });

  it("renders initials for Georgian names", () => {
    render(<AvatarStack users={[{ id: 1, name: "ნინო ბერიძე" }]} />);
    expect(screen.getByRole("img", { name: "ნინო ბერიძე" })).toHaveTextContent("ნბ");
  });

  it("shows a dashed empty circle with an accessible title", () => {
    render(<AvatarStack users={[]} emptyLabel="Unassigned" />);
    const empty = screen.getByRole("img", { name: "Unassigned" });
    expect(empty).toHaveAttribute("title", "Unassigned");
    expect(empty.className).toContain("border-dashed");
    expect(empty.querySelector("svg")).not.toBeNull();
  });

  it("renders nothing when empty and no emptyLabel", () => {
    const { container } = render(<AvatarStack users={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ring colour follows ringColor: card vs background (DC14)", () => {
    const { container, rerender } = render(<AvatarStack users={users.slice(0, 2)} ringColor="card" />);
    container.querySelectorAll('[data-slot="avatar"]').forEach((a) => {
      expect(a.className).toContain("border-card");
      expect(a.className).not.toContain("border-background");
    });
    rerender(<AvatarStack users={users.slice(0, 2)} ringColor="background" size={24} />);
    container.querySelectorAll('[data-slot="avatar"]').forEach((a) => {
      expect(a.className).toContain("border-background");
      expect(a.className).toContain("border-2");
    });
  });

  it("sizes: 14 (rail pill), 20 (card), 22 (list), 24 (viewers with -6px overlap)", () => {
    const sizes = { 14: "size-3.5", 20: "size-5", 22: "size-[22px]", 24: "size-6" } as const;
    for (const [size, cls] of Object.entries(sizes)) {
      const { container, unmount } = render(<AvatarStack users={users.slice(0, 2)} size={Number(size) as 14 | 20 | 22 | 24} />);
      const avatars = container.querySelectorAll('[data-slot="avatar"]');
      expect(avatars[0].className).toContain(cls);
      expect(avatars[0].className).not.toMatch(/-ml-/);
      if (size === "24") expect(avatars[1].className).toContain("-ml-1.5");
      if (size === "14") expect(avatars[0].className).toContain("text-[6px]");
      unmount();
    }
  });

  it("viewers (24) default to the muted fill, assignees to the primary tint", () => {
    const { container } = render(
      <>
        <AvatarStack users={users.slice(0, 1)} size={24} ringColor="background" />
        <AvatarStack users={users.slice(0, 1)} size={20} />
      </>,
    );
    const [viewer, assignee] = Array.from(container.querySelectorAll('[data-slot="avatar"]'));
    expect(viewer.className).toContain("bg-muted");
    expect(assignee.className).toContain("bg-primary/10");
  });
});
