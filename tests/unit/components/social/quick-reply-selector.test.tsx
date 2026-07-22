/**
 * Tests for QuickReplySelector — the ⚡ saved-replies dialog in the composer.
 * Focuses on the eye-toggle preview: long messages are clamped to two lines,
 * and the eye button expands the row to show the full message without
 * inserting it into the composer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { QuickReply } from "@/hooks/api/useSocial";

const mockToast = vi.fn();
const mockDelete = vi.fn();

let mockReplies: QuickReply[] = [];

vi.mock("@/hooks/api/useSocial", () => ({
  useQuickReplies: () => ({ data: mockReplies, isLoading: false }),
  useDeleteQuickReply: () => ({ mutate: mockDelete, isPending: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/social/QuickReplyForm", () => ({
  QuickReplyForm: () => <div data-testid="quick-reply-form" />,
}));

import { QuickReplySelector } from "@/components/social/QuickReplySelector";

const LONG_MESSAGE =
  "Hello! Thank you for reaching out to us. We have received your request and " +
  "one of our agents will get back to you as soon as possible with a full answer.";

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

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /quick replies/i }));
}

describe("QuickReplySelector eye toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplies = [];
  });

  it("shows the eye button only for long or multi-line messages", async () => {
    mockReplies = [
      makeQuickReply({ id: 1, title: "Long", message: LONG_MESSAGE }),
      makeQuickReply({ id: 2, title: "Short", message: "Hi!" }),
      makeQuickReply({ id: 3, title: "Multiline", message: "Hi\nthere" }),
    ];
    const user = userEvent.setup();
    render(<QuickReplySelector platform="whatsapp" onSelect={vi.fn()} />);
    await openDialog(user);

    expect(
      screen.getByRole("button", { name: "Show full message of Long" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show full message of Multiline" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show full message of Short" })
    ).not.toBeInTheDocument();
  });

  it("expands and collapses the full message without inserting it", async () => {
    mockReplies = [makeQuickReply({ id: 1, title: "Long", message: LONG_MESSAGE })];
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<QuickReplySelector platform="whatsapp" onSelect={onSelect} />);
    await openDialog(user);

    const message = screen.getByText(LONG_MESSAGE);
    expect(message).toHaveClass("line-clamp-2");

    await user.click(screen.getByRole("button", { name: "Show full message of Long" }));
    expect(message).not.toHaveClass("line-clamp-2");
    expect(message).toHaveClass("whitespace-pre-wrap");
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Hide full message of Long" }));
    expect(message).toHaveClass("line-clamp-2");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still inserts the message when the row itself is clicked", async () => {
    mockReplies = [makeQuickReply({ id: 1, title: "Long", message: LONG_MESSAGE })];
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<QuickReplySelector platform="whatsapp" onSelect={onSelect} />);
    await openDialog(user);

    await user.click(screen.getByText(LONG_MESSAGE));
    expect(onSelect).toHaveBeenCalledWith(LONG_MESSAGE);
  });
});
