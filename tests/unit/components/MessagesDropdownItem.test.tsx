/**
 * Tests for MessagesDropdownItem — the conversation row in the messages
 * dropdown, which overlays a small platform-icon badge on the avatar.
 *
 * Regression guard: email (and widget) conversations are fetched into this
 * dropdown, but PlatformIcon previously only knew facebook/instagram/whatsapp,
 * so email rows rendered a blank, uncolored badge. Email must now get a Mail
 * badge like Facebook does.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MessagesDropdownItem } from "@/components/MessagesDropdownItem";
import type { RecentConversation } from "@/hooks/api/useSocial";

function makeConversation(
  overrides: Partial<RecentConversation> = {}
): RecentConversation {
  return {
    id: "email_1_2",
    platform: "email",
    conversationId: "c1",
    accountId: "a1",
    senderName: "Jane Doe",
    senderAvatar: undefined,
    lastMessage: "Hello there",
    lastMessageAt: new Date("2025-01-15T10:00:00Z"),
    unreadCount: 0,
    ...overrides,
  };
}

describe("MessagesDropdownItem platform badge", () => {
  it("renders a colored email badge with an icon for email conversations", () => {
    const { container } = render(
      <MessagesDropdownItem
        conversation={makeConversation({ platform: "email" })}
        onClick={vi.fn()}
      />
    );

    // An icon (svg) is rendered in the badge...
    expect(container.querySelector("svg")).not.toBeNull();
    // ...and it carries the email badge color (was uncolored/blank before).
    expect(container.innerHTML).toContain("bg-[#475569]");
  });

  it("renders the Facebook badge color for facebook conversations", () => {
    const { container } = render(
      <MessagesDropdownItem
        conversation={makeConversation({ platform: "facebook" })}
        onClick={vi.fn()}
      />
    );

    expect(container.innerHTML).toContain("bg-[#1877F2]");
  });

  it("renders a widget badge for widget conversations", () => {
    const { container } = render(
      <MessagesDropdownItem
        conversation={makeConversation({ platform: "widget" })}
        onClick={vi.fn()}
      />
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.innerHTML).toContain("bg-[#6366F1]");
  });

  it("renders no badge for an unexpected platform value", () => {
    const { container } = render(
      <MessagesDropdownItem
        conversation={makeConversation({
          platform: "sms" as RecentConversation["platform"],
        })}
        onClick={vi.fn()}
      />
    );

    // Guard returns null → no badge icon rendered.
    expect(container.querySelector("svg")).toBeNull();
  });

  it("shows the sender name and last message, and fires onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <MessagesDropdownItem
        conversation={makeConversation({
          senderName: "Jane Doe",
          lastMessage: "Hello there",
        })}
        onClick={onClick}
      />
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
