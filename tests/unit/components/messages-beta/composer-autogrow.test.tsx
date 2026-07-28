/**
 * Tests for the composer textarea auto-grow: multi-line input (Shift+Enter)
 * must grow the textarea with its content up to the max height, then stop
 * (internal scroll), and shrink back when cleared — Messenger-style.
 *
 * jsdom does no layout, so scrollHeight is mocked on the prototype.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type { ConversationRow } from "@/components/messages-beta/store/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: 5, email: "agent@test.com" } }),
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useSocialSettings: () => ({ data: { chat_assignment_enabled: false } }),
  useAssignChat: () => ({ mutateAsync: vi.fn() }),
  useStartSession: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useTypingWebSocket", () => ({
  useTypingWebSocket: () => ({
    sendTypingStart: vi.fn(),
    sendTypingStop: vi.fn(),
  }),
}));

vi.mock("@/components/ui/emoji-picker", () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
}));

vi.mock("@/components/social/QuickReplySelector", () => ({
  QuickReplySelector: () => <div data-testid="quick-reply-selector" />,
}));

vi.mock(
  "@/components/messages-beta/composer/QuickReplySuggestions",
  () => ({
    QuickReplySuggestions: () => null,
  })
);

import { MessagesBetaComposer } from "@/components/messages-beta/composer/MessagesBetaComposer";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";

function makeRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_p_1",
    platform: "facebook",
    accountId: "p",
    conversationKey: "sender_1",
    name: "Alice",
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

// jsdom reports scrollHeight as 0; simulate content height instead.
let mockScrollHeight = 40;
let scrollHeightSpy: { restore: () => void };

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
  mockScrollHeight = 40;
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight"
  );
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return mockScrollHeight;
    },
  });
  scrollHeightSpy = {
    restore() {
      delete (HTMLTextAreaElement.prototype as any).scrollHeight;
      if (original) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", original);
      }
    },
  };
});

afterEach(() => {
  scrollHeightSpy.restore();
});

describe("MessagesBetaComposer auto-grow", () => {
  it("grows the textarea to fit multi-line content", async () => {
    const user = userEvent.setup();
    render(<MessagesBetaComposer conversation={makeRow()} />);

    const textarea = screen.getByPlaceholderText("placeholder");
    mockScrollHeight = 96;
    await user.type(textarea, "line1{Shift>}{Enter}{/Shift}line2{Shift>}{Enter}{/Shift}line3");

    await waitFor(() => expect(textarea.style.height).toBe("96px"));
  });

  it("caps growth at the max height", async () => {
    const user = userEvent.setup();
    render(<MessagesBetaComposer conversation={makeRow()} />);

    const textarea = screen.getByPlaceholderText("placeholder");
    mockScrollHeight = 480;
    await user.type(textarea, "a very long message");

    await waitFor(() => expect(textarea.style.height).toBe("160px"));
  });

  it("shrinks back when the content is cleared", async () => {
    const user = userEvent.setup();
    render(<MessagesBetaComposer conversation={makeRow()} />);

    const textarea = screen.getByPlaceholderText("placeholder");
    mockScrollHeight = 120;
    await user.type(textarea, "line1{Shift>}{Enter}{/Shift}line2");
    await waitFor(() => expect(textarea.style.height).toBe("120px"));

    mockScrollHeight = 40;
    await user.clear(textarea);
    await waitFor(() => expect(textarea.style.height).toBe("40px"));
  });
});
