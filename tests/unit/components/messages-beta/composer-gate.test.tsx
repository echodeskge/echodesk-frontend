/**
 * Composer gate (design): with assignment mode on, an unassigned chat shows
 * "Assign to me" instead of the composer; WhatsApp chats get the template
 * button in the composer, other channels don't.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";

const settings = vi.hoisted(() => ({ assignment: false }));

vi.mock("@/api/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/hooks/api/useSocial", () => ({
  useAssignChat: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartSession: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSocialSettings: () => ({ data: { chat_assignment_enabled: settings.assignment } }),
  useMessagingWindow: () => ({ data: undefined, refetch: vi.fn() }),
  useSendWhatsAppTemplateMessage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/social/TemplateSelector", () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
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
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";
import type { ConversationRow } from "@/components/messages-beta/store/types";

function row(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "wa_waba1_995555",
    platform: "whatsapp",
    accountId: "waba1",
    conversationKey: "995555",
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

const c = en.messagesBeta.composer;

describe("MessagesBetaComposer gate", () => {
  beforeEach(() => {
    useMessagesBetaStore.getState().reset();
    settings.assignment = false;
  });

  it("shows Assign to me instead of the composer for an unassigned chat", () => {
    settings.assignment = true;
    renderComposer();
    expect(screen.getByTestId("composer-gate")).toHaveTextContent(c.assignToStartMessaging);
    expect(screen.getByRole("button", { name: c.assignToMe })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(c.placeholder)).toBeNull();
  });

  it("offers Send template on WhatsApp chats", () => {
    renderComposer();
    expect(screen.getByTestId("composer-send-template")).toHaveAccessibleName(c.sendTemplate);
    expect(screen.getByPlaceholderText(c.placeholder)).toBeEnabled();
  });

  it("does not offer templates on other channels", () => {
    renderComposer(row({ id: "fb_page1_psid9", platform: "facebook", accountId: "page1", conversationKey: "psid9" }));
    expect(screen.queryByTestId("composer-send-template")).toBeNull();
  });
});
