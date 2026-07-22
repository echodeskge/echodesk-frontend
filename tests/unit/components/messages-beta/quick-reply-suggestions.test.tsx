/**
 * Tests for QuickReplySuggestions — the inline "Saved reply · Click to insert"
 * bar above the composer. The eye button on long replies opens the full
 * message in an edit popup (QuickReplyForm) instead of inserting it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { QuickReply } from "@/hooks/api/useSocial";

let mockReplies: QuickReply[] = [];
let lastFormProps: { editingReply: QuickReply | null; onCancel: () => void } | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useQuickReplies: () => ({ data: mockReplies }),
}));

vi.mock("@/components/social/QuickReplyForm", () => ({
  QuickReplyForm: (props: { editingReply: QuickReply | null; onCancel: () => void }) => {
    lastFormProps = props;
    return <div data-testid="quick-reply-form" />;
  },
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

describe("QuickReplySuggestions eye popup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplies = [];
    lastFormProps = null;
  });

  it("shows the eye button only for long or multi-line messages", () => {
    mockReplies = [
      makeQuickReply({ id: 1, title: "Greeting long", message: LONG_MESSAGE }),
      makeQuickReply({ id: 2, title: "Greeting short", message: "Hi!" }),
      makeQuickReply({ id: 3, title: "Greeting multiline", message: "Hi\nthere" }),
    ];
    renderBar();

    expect(
      screen.getByRole("button", { name: "showFullMessage: Greeting long" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "showFullMessage: Greeting multiline" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "showFullMessage: Greeting short" })
    ).not.toBeInTheDocument();
  });

  it("opens the edit popup for the clicked reply without inserting it", async () => {
    mockReplies = [makeQuickReply({ id: 7, title: "Greeting", message: LONG_MESSAGE })];
    const user = userEvent.setup();
    const onSelect = renderBar();

    expect(screen.queryByTestId("quick-reply-form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "showFullMessage: Greeting" }));

    expect(screen.getByTestId("quick-reply-form")).toBeInTheDocument();
    expect(lastFormProps?.editingReply?.id).toBe(7);
    expect(lastFormProps?.editingReply?.message).toBe(LONG_MESSAGE);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes the popup when the form cancels", async () => {
    mockReplies = [makeQuickReply({ id: 7, title: "Greeting", message: LONG_MESSAGE })];
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole("button", { name: "showFullMessage: Greeting" }));
    expect(screen.getByTestId("quick-reply-form")).toBeInTheDocument();

    lastFormProps?.onCancel();
    await vi.waitFor(() => {
      expect(screen.queryByTestId("quick-reply-form")).not.toBeInTheDocument();
    });
  });

  it("still inserts the message when the suggestion itself is clicked", async () => {
    mockReplies = [makeQuickReply({ id: 1, title: "Greeting", message: LONG_MESSAGE })];
    const user = userEvent.setup();
    const onSelect = renderBar();

    await user.click(screen.getByText(LONG_MESSAGE));
    expect(onSelect).toHaveBeenCalledWith(LONG_MESSAGE);
  });
});
