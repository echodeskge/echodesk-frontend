/**
 * Team chat launcher (dock slot 0): a labelled button with the destructive
 * unread badge, aria-expanded and the shared dock position.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { TeamChatIcon } from "@/components/TeamChat/TeamChatIcon";
import { DOCK } from "@/components/TeamChat/floatingDock";

function renderIcon(props: Partial<React.ComponentProps<typeof TeamChatIcon>> = {}, messages: Record<string, unknown> = en, locale = "en") {
  const onClick = vi.fn();
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TeamChatIcon unreadCount={0} isOpen={false} onClick={onClick} {...props} />
    </NextIntlClientProvider>
  );
  return { onClick, button: screen.getByRole("button") };
}

describe("TeamChatIcon", () => {
  it("is a labelled button at the dock's first slot", async () => {
    const user = userEvent.setup();
    const { onClick, button } = renderIcon();
    expect(button).toHaveAccessibleName("Open team chat");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("data-teamchat-trigger");
    expect(button.style.right).toBe(`${DOCK.RIGHT}px`);
    expect(button.style.bottom).toBe(`${DOCK.BOTTOM}px`);
    expect(button.style.width).toBe(`${DOCK.SLOT_SIZE}px`);
    expect(screen.queryByTestId("teamchat-unread-badge")).toBeNull();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the destructive unread badge and announces the count", () => {
    const { button } = renderIcon({ unreadCount: 3 });
    const badge = screen.getByTestId("teamchat-unread-badge");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground");
    expect(button).toHaveAccessibleName("Open team chat · 3 unread messages");
  });

  it("caps the badge at 99+", () => {
    renderIcon({ unreadCount: 140 });
    expect(screen.getByTestId("teamchat-unread-badge")).toHaveTextContent("99+");
  });

  it("reflects the open state", () => {
    const { button } = renderIcon({ isOpen: true, unreadCount: 1 });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAccessibleName("Close team chat · 1 unread message");
  });

  it("is translated to Georgian", () => {
    const { button } = renderIcon({ unreadCount: 2 }, ka, "ka");
    expect(button).toHaveAccessibleName(`${ka.calls.dock.openTeamChat} · 2 წაუკითხავი შეტყობინება`);
  });
});
