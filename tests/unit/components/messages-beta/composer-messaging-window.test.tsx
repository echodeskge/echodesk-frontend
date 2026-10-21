/**
 * MessagesBetaComposer × Meta reply window (Messenger / Instagram):
 *  - within 24h → normal composer, no banner;
 *  - 24h–7d with Human Agent → info banner, sending stays enabled;
 *  - after 7 days / no Human Agent → composer disabled with the closed banner;
 *  - a 400 `outside_messaging_window` → the friendly copy, not the raw error;
 *  - the window is re-read after a send.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import type { MessagingWindowStatus } from "@/hooks/api/useSocial";

const mockPost = vi.fn();
const mockToastError = vi.fn();
const mockRefetchWindow = vi.fn();
const mockUseMessagingWindow = vi.fn();
let mockWindow: MessagingWindowStatus | undefined;

vi.mock("@/api/axios", () => ({ default: { post: (...a: unknown[]) => mockPost(...a) } }));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a) } }));
vi.mock("@/hooks/api/useSocial", () => ({
  useAssignChat: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSocialSettings: () => ({ data: { chat_assignment_enabled: false } }),
  useMessagingWindow: (...args: unknown[]) => {
    mockUseMessagingWindow(...args);
    return { data: mockWindow, refetch: mockRefetchWindow };
  },
}));
vi.mock("@/hooks/useTypingWebSocket", () => ({
  useTypingWebSocket: () => ({ sendTypingStart: vi.fn(), sendTypingStop: vi.fn() }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, email: "agent@example.com", first_name: "Ana", last_name: "" } }),
}));
vi.mock("@/components/social/QuickReplySelector", () => ({ QuickReplySelector: () => null }));
vi.mock("@/components/messages-beta/composer/QuickReplySuggestions", () => ({
  QuickReplySuggestions: () => null,
}));
vi.mock("@/components/ui/emoji-picker", () => ({ EmojiPicker: () => null }));
vi.mock("@/lib/pendingMedia", () => ({ addPendingMedia: vi.fn() }));

import { MessagesBetaComposer } from "@/components/messages-beta/composer/MessagesBetaComposer";
import type { ConversationRow } from "@/components/messages-beta/store/types";

const LAST = "2026-10-15T10:00:00Z";

function row(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_page1_psid9",
    platform: "facebook",
    accountId: "page1",
    conversationKey: "psid9",
    name: "Customer",
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

function renderComposer(conversation = row()) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MessagesBetaComposer conversation={conversation} />
    </NextIntlClientProvider>
  );
}

const composerEn = en.messagesBeta.composer;

describe("MessagesBetaComposer — Meta messaging window", () => {
  beforeEach(() => {
    mockWindow = undefined;
    mockPost.mockReset();
    mockToastError.mockReset();
    mockRefetchWindow.mockReset();
    mockUseMessagingWindow.mockReset();
    // jsdom has no rAF focus concerns, but the composer calls it after send.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("queries the window with the same page / customer ids the send uses", () => {
    renderComposer();
    expect(mockUseMessagingWindow).toHaveBeenCalledWith("facebook", "psid9", "page1", { enabled: true });
  });

  it("does not query the window for non-Meta platforms", () => {
    renderComposer(row({ id: "wa_waba1_995555", platform: "whatsapp", accountId: "waba1" }));
    expect(mockUseMessagingWindow).toHaveBeenCalledWith("whatsapp", "995555", "waba1", { enabled: false });
  });

  it("within 24h shows no banner and allows sending", async () => {
    mockWindow = { window_open: true, hours_remaining: 10, last_user_message_at: LAST };
    renderComposer();
    expect(screen.queryByTestId("human-agent-window-banner")).toBeNull();
    expect(screen.queryByTestId("messaging-window-closed-banner")).toBeNull();
    expect(screen.getByPlaceholderText(composerEn.placeholder)).toBeEnabled();
  });

  it("between 24h and 7 days shows the Human Agent banner and keeps sending enabled", async () => {
    mockWindow = {
      window_open: false,
      hours_remaining: 0,
      human_agent_window_open: true,
      human_agent_hours_remaining: 100.6,
      last_user_message_at: LAST,
    };
    mockPost.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderComposer();

    const banner = screen.getByTestId("human-agent-window-banner");
    expect(banner).toHaveTextContent(
      "The 24-hour window has closed. You can still reply as a human agent for 100 more hours. Replies are sent with Meta's Human Agent tag."
    );

    const box = screen.getByPlaceholderText(composerEn.placeholder);
    expect(box).toBeEnabled();
    await user.type(box, "Hello again");
    await user.click(screen.getByRole("button", { name: composerEn.sendMessage }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/api/social/facebook/send-message/",
        expect.objectContaining({ recipient_id: "psid9", page_id: "page1", message: "Hello again" })
      )
    );
    await waitFor(() => expect(mockRefetchWindow).toHaveBeenCalled());
  });

  it("after 7 days (or without Human Agent) disables the composer with the closed banner", () => {
    mockWindow = {
      window_open: false,
      hours_remaining: 0,
      human_agent_window_open: false,
      human_agent_hours_remaining: 0,
      last_user_message_at: LAST,
    };
    renderComposer(row({ id: "ig_acct1_igsid", platform: "instagram", accountId: "acct1" }));

    expect(screen.getByTestId("messaging-window-closed-banner")).toHaveTextContent(
      "Meta only allows replies within 7 days of the customer's last message (24 hours without Human Agent)."
    );
    expect(screen.getByPlaceholderText(composerEn.placeholderWindowClosed)).toBeDisabled();
    expect(screen.getByRole("button", { name: composerEn.sendMessage })).toBeDisabled();
    expect(screen.getByRole("button", { name: composerEn.attachFile })).toBeDisabled();
  });

  it("maps a 400 outside_messaging_window to the friendly copy and re-reads the window", async () => {
    mockWindow = { window_open: true, hours_remaining: 1, last_user_message_at: LAST };
    mockPost.mockRejectedValue({
      response: {
        status: 400,
        data: { code: "outside_messaging_window", error: "Reply not allowed: outside window" },
      },
    });
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText(composerEn.placeholder), "Late reply");
    await user.click(screen.getByRole("button", { name: composerEn.sendMessage }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(composerEn.outsideMessagingWindow));
    expect(mockRefetchWindow).toHaveBeenCalled();
  });

  it("still shows the raw error for unrelated failures", async () => {
    mockWindow = { window_open: true, hours_remaining: 1, last_user_message_at: LAST };
    mockPost.mockRejectedValue({ response: { status: 400, data: { error: "Page token expired" } } });
    const user = userEvent.setup();
    renderComposer();

    await user.type(screen.getByPlaceholderText(composerEn.placeholder), "Hi");
    await user.click(screen.getByRole("button", { name: composerEn.sendMessage }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Page token expired"));
  });
});
