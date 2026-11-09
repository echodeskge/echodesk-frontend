/** FE-10 meta row: 22px priority pill, label chips, "opened {date} by {reporter}" (ICU, ka dates). */
import { describe, it, expect } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { DetailMeta } from "@/app/(tenant)/tickets/[id]/_components/main/detail-meta";
import { makeTicket } from "../helpers";
import { renderMain } from "./main-helpers";

const reporter = { id: 4, name: "Giorgi G.", initials: "GG", email: "g@x.ge" };

describe("DetailMeta", () => {
  it("shows the md (22px) priority pill and every label as a md chip", () => {
    const ticket = makeTicket({
      priority: "critical",
      tags: [
        { id: 1, name: "Bug", color: "#ef4444" },
        { id: 2, name: "VIP", color: "#a855f7" },
        { id: 3, name: "Billing", color: "#22c55e" },
        { id: 4, name: "Phones", color: "#3b82f6" },
      ],
      reporter,
    });
    renderMain(<DetailMeta ticket={ticket} />);
    const pill = document.querySelector('[data-slot="priority-pill"]')!;
    expect(pill).toHaveClass("h-[22px]", "text-xs", "font-semibold", "rounded-md");
    expect(pill).toHaveTextContent("Critical");
    const chips = document.querySelectorAll('[data-slot="label-chip"]');
    // Detail shows all labels (no "+n" collapse).
    expect(chips).toHaveLength(4);
    chips.forEach((c) => expect(c).toHaveClass("h-[22px]"));
    expect(screen.getByText("Phones")).toBeInTheDocument();
  });

  it("reads '· opened {date} by {reporter}' in English", () => {
    renderMain(<DetailMeta ticket={makeTicket({ created_at: "2025-03-05T10:00:00Z", reporter })} />);
    expect(document.querySelector('[data-slot="detail-opened"]')).toHaveTextContent("· opened Mar 5, 2025 by Giorgi G.");
  });

  it("uses Georgian month names and word order in ka", () => {
    renderMain(<DetailMeta ticket={makeTicket({ created_at: "2025-03-05T10:00:00Z", reporter })} />, { locale: "ka" });
    const text = document.querySelector('[data-slot="detail-opened"]')!.textContent!;
    expect(text).toContain("Giorgi G.");
    expect(text).toMatch(/5 მარ 2025/);
    expect(text).not.toMatch(/opened|Mar/);
  });

  it("falls back to created_by, then to a date-only sentence", () => {
    const { unmount } = renderMain(
      <DetailMeta
        ticket={makeTicket({ created_at: "2025-03-05T10:00:00Z", created_by: { id: 1, email: "a@x.ge", first_name: "Nino", last_name: "B" } })}
      />,
    );
    expect(document.querySelector('[data-slot="detail-opened"]')).toHaveTextContent("opened Mar 5, 2025 by Nino B");
    unmount();
    renderMain(<DetailMeta ticket={makeTicket({ created_at: "2025-03-05T10:00:00Z" })} />);
    expect(document.querySelector('[data-slot="detail-opened"]')).toHaveTextContent(/^· opened Mar 5, 2025$/);
  });
});
