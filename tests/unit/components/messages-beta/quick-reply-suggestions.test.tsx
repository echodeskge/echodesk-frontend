/**
 * Tests for QuickReplySuggestions — the inline "Saved reply · Click to insert"
 * bar above the composer. Focuses on the eye-toggle preview: long messages are
 * truncated to one line, and the eye button expands the row to show the full
 * message without inserting it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { QuickReply } from "@/hooks/api/useSocial";

let mockReplies: QuickReply[] = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useQuickReplies: () => ({ data: mockReplies }),
}));

import { QuickReplySuggestions } from "@/components/messages-beta/composer/QuickReplySuggestions";

const LONG_MESSAGE =
  "Greetings! Thank you for reaching out to us. We have received your request " +
  "and one of our agents will get back to you as soon as possible with an answer.";

function makeQuickReply(overrides: Partial<QuickReply> = {}): QuickReply {
  return {
    id: 1,
    title: "Greeting",
    message: "Hi!",
    platforms: ["all"],
    shortcut: "",
    category: "",
    use_count: 0,
    position: 0,
    created_by: null,
    created_by_name: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderBar(onSelect = vi.fn()) {
  render(
    <QuickReplySuggestions
      query="gre"
      platform="whatsapp"
      onSelect={onSelect}
    />
  );
  return onSelect;
}

describe("QuickReplySuggestions eye toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplies = [];
  });

  it("shows the eye button only for long or multi-line messages", () => {
    mockReplies = [
      makeQuickReply({ id: 1, title: "Greeting long", message: LONG_MESSAGE }),
      makeQuickReply({ id: 2, title: "Greeting short", message: "Hi!" }),
    ];
    renderBar();

    expect(
      screen.getByRole("button", { name: "showFullMessage: Greeting long" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "showFullMessage: Greeting short" })
    ).not.toBeInTheDocument();
  });

  it("expands and collapses the full message without inserting it", async () => {
    mockReplies = [makeQuickReply({ id: 1, title: "Greeting", message: LONG_MESSAGE })];
    const user = userEvent.setup();
    const onSelect = renderBar();

    const message = screen.getByText(LONG_MESSAGE);
    expect(message).toHaveClass("truncate");

    await user.click(screen.getByRole("button", { name: "showFullMessage: Greeting" }));
    expect(message).not.toHaveClass("truncate");
    expect(message).toHaveClass("whitespace-pre-wrap");
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "hideFullMessage: Greeting" }));
    expect(message).toHaveClass("truncate");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still inserts the message when the suggestion itself is clicked", async () => {
    mockReplies = [makeQuickReply({ id: 1, title: "Greeting", message: LONG_MESSAGE })];
    const user = userEvent.setup();
    const onSelect = renderBar();

    await user.click(screen.getByText(LONG_MESSAGE));
    expect(onSelect).toHaveBeenCalledWith(LONG_MESSAGE);
  });
});
