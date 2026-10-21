/**
 * Message bubble labels for Messenger / Instagram sends:
 *  - "Human agent reply" when the backend reports message_tag HUMAN_AGENT;
 *  - "Automated" for EchoDesk's own sends (auto-reply, AI, rating request);
 *  - nothing for a normal reply, a customer's message or another platform.
 * Plus the adapter heuristic that derives `isAutomated` from the API row.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { MessageType, UserType } from "@/components/chat/types";
import { convertUnifiedMessagesToMessageType, isAutomatedSend } from "@/lib/chatAdapter";

const sender = { id: "business", name: "Page" } as unknown as UserType;

function msg(overrides: Partial<MessageType> = {}): MessageType {
  return {
    id: "1",
    senderId: "business",
    text: "Hello",
    status: "SENT",
    createdAt: new Date(),
    ...overrides,
  };
}

function renderBubble(
  message: MessageType,
  {
    platform = "facebook",
    outgoing = true,
    messages = en,
  }: { platform?: "facebook" | "instagram" | "whatsapp"; outgoing?: boolean; messages?: typeof en } = {}
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ul>
        <MessageBubble sender={sender} message={message} isByCurrentUser={outgoing} platform={platform} />
      </ul>
    </NextIntlClientProvider>
  );
}

describe("MessageBubble send-kind label", () => {
  it("labels a HUMAN_AGENT-tagged Messenger reply", () => {
    renderBubble(msg({ messageTag: "HUMAN_AGENT", sentByName: "Ana" }));
    expect(screen.getByTestId("human-agent-label")).toHaveTextContent("Human agent reply");
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByTestId("automated-label")).toBeNull();
  });

  it("labels an automated Instagram send", () => {
    renderBubble(msg({ isAutomated: true }), { platform: "instagram" });
    expect(screen.getByTestId("automated-label")).toHaveTextContent("Automated");
  });

  it("uses the Georgian strings", () => {
    renderBubble(msg({ messageTag: "HUMAN_AGENT" }), { messages: ka as unknown as typeof en });
    expect(screen.getByTestId("human-agent-label")).toHaveTextContent(ka.chat.humanAgentReply);
  });

  it("shows nothing for a normal reply, an incoming message or WhatsApp", () => {
    const { unmount } = renderBubble(msg({ sentByName: "Ana" }));
    expect(screen.queryByTestId("human-agent-label")).toBeNull();
    expect(screen.queryByTestId("automated-label")).toBeNull();
    unmount();

    const incoming = renderBubble(msg({ messageTag: "HUMAN_AGENT", isAutomated: true }), { outgoing: false });
    expect(screen.queryByTestId("human-agent-label")).toBeNull();
    expect(screen.queryByTestId("automated-label")).toBeNull();
    incoming.unmount();

    renderBubble(msg({ isAutomated: true }), { platform: "whatsapp" });
    expect(screen.queryByTestId("automated-label")).toBeNull();
  });
});

describe("isAutomatedSend", () => {
  const base = { is_from_business: true, source: "echodesk" };

  it("is true for an EchoDesk send with no staff author", () => {
    expect(isAutomatedSend({ ...base, sent_by: null, sent_by_name: "" })).toBe(true);
  });

  it("is false when a staff member sent it", () => {
    expect(isAutomatedSend({ ...base, sent_by: 4, sent_by_name: "Ana" })).toBe(false);
    expect(isAutomatedSend({ ...base, sent_by: "ana@example.com" })).toBe(false);
  });

  it("is false when the payload does not carry sent_by at all", () => {
    expect(isAutomatedSend({ ...base })).toBe(false);
  });

  it("is false for echoes from the Messenger / Instagram apps and customer messages", () => {
    expect(isAutomatedSend({ is_from_business: true, source: "messenger_app", sent_by: null })).toBe(false);
    expect(isAutomatedSend({ is_from_business: false, source: "echodesk", sent_by: null })).toBe(false);
  });

  it("honours an explicit flag", () => {
    expect(isAutomatedSend({ is_from_business: true, is_ai: true })).toBe(true);
    expect(isAutomatedSend({ ...base, sent_by: null, is_automated: false })).toBe(false);
  });

  it("is mapped by the REST adapter together with the message tag", () => {
    const [human, auto] = convertUnifiedMessagesToMessageType([
      {
        id: "1",
        platform: "facebook",
        sender_id: "page",
        sender_name: "Page",
        message_text: "Following up",
        timestamp: "2026-10-20T10:00:00Z",
        is_from_business: true,
        conversation_id: "c",
        platform_message_id: "m1",
        account_id: "page",
        source: "echodesk",
        sent_by: 4,
        sent_by_name: "Ana",
        messaging_type: "MESSAGE_TAG",
        message_tag: "HUMAN_AGENT",
      },
      {
        id: "2",
        platform: "facebook",
        sender_id: "page",
        sender_name: "Page",
        message_text: "Thanks, we'll be in touch",
        timestamp: "2026-10-20T10:01:00Z",
        is_from_business: true,
        conversation_id: "c",
        platform_message_id: "m2",
        account_id: "page",
        source: "echodesk",
        sent_by: null,
        messaging_type: "RESPONSE",
      },
    ]);
    expect(human.messageTag).toBe("HUMAN_AGENT");
    expect(human.messagingType).toBe("MESSAGE_TAG");
    expect(human.isAutomated).toBe(false);
    expect(auto.isAutomated).toBe(true);
    expect(auto.messageTag).toBeUndefined();
  });
});
