/**
 * Reading-pane footer: Reply, Reply all and Forward route to the composer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockPush = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { EmailViewContentFooter } from "@/app/(tenant)/email/_components/email-view-content-footer";
import type { EmailMessage } from "@/hooks/api/useSocial";

const email = { id: 42 } as EmailMessage;

describe("EmailViewContentFooter", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["reply", "/email/compose?reply_to=42"],
    ["replyAll", "/email/compose?reply_all=42"],
    ["forward", "/email/compose?forward=42"],
  ])("%s opens the composer", async (label, href) => {
    const user = userEvent.setup();
    render(<EmailViewContentFooter email={email} filter="INBOX" />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(mockPush).toHaveBeenCalledWith(href);
  });

  it("wraps the buttons instead of clipping them on narrow screens", () => {
    render(<EmailViewContentFooter email={email} filter="INBOX" />);
    const footer = screen.getByRole("button", { name: "forward" }).parentElement!;
    expect(footer.className).toContain("flex-wrap");
  });
});
