/**
 * Tests for chatAdapter.ts — pure conversion functions.
 * No mocking needed (pure functions).
 */
import { describe, it, expect } from "vitest";
import {
  convertFacebookMessagesToChatFormat,
  convertSingleConversation,
  convertUnifiedMessagesToMessageType,
  convertApiConversationsToChatFormat,
} from "@/lib/chatAdapter";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeUnifiedMessage(overrides: Record<string, any> = {}) {
  return {
    id: "msg-1",
    platform: "facebook" as const,
    sender_id: "sender_1",
    sender_name: "John Doe",
    message_text: "Hello",
    timestamp: "2024-06-01T10:00:00Z",
    is_from_business: false,
    conversation_id: "conv_1",
    platform_message_id: "mid.1",
    account_id: "page_1",
    ...overrides,
  };
}

function makeUnifiedConversation(overrides: Record<string, any> = {}) {
  return {
    platform: "facebook" as const,
    conversation_id: "conv_1",
    sender_id: "sender_1",
    sender_name: "John Doe",
    profile_pic_url: "https://example.com/avatar.jpg",
    last_message: makeUnifiedMessage(),
    message_count: 1,
    account_name: "My Page",
    account_id: "page_1",
    ...overrides,
  };
}

function makeApiConversation(overrides: Record<string, any> = {}) {
  return {
    conversation_id: "conv_1",
    platform: "facebook" as const,
    sender_id: "sender_1",
    sender_name: "John Doe",
    profile_pic_url: "https://example.com/avatar.jpg",
    last_message: {
      id: "msg-1",
      text: "Hello",
      timestamp: "2024-06-01T10:00:00Z",
      is_from_business: false,
      platform_message_id: "mid.1",
    },
    message_count: 1,
    unread_count: 0,
    account_name: "My Page",
    account_id: "page_1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// stripHtmlTags (tested via convertApiConversationsToChatFormat for emails)
// ---------------------------------------------------------------------------

describe("stripHtmlTags (via convertApiConversationsToChatFormat)", () => {
  it("strips HTML tags from email last message", () => {
    const conv = makeApiConversation({
      platform: "email",
      last_message: {
        id: "e1",
        text: "<p>Hello <b>World</b></p>",
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        platform_message_id: "email-1",
      },
    });
    const [chat] = convertApiConversationsToChatFormat([conv]);
    expect(chat.lastMessage.content).toBe("Hello World");
  });

  it("decodes HTML entities", () => {
    const conv = makeApiConversation({
      platform: "email",
      last_message: {
        id: "e2",
        text: "Tom &amp; Jerry &lt;script&gt;",
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        platform_message_id: "email-2",
      },
    });
    const [chat] = convertApiConversationsToChatFormat([conv]);
    expect(chat.lastMessage.content).toBe("Tom & Jerry <script>");
  });

  it("collapses multiple spaces", () => {
    const conv = makeApiConversation({
      platform: "email",
      last_message: {
        id: "e3",
        text: "<p>Hello</p>  <p>World</p>",
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        platform_message_id: "email-3",
      },
    });
    const [chat] = convertApiConversationsToChatFormat([conv]);
    expect(chat.lastMessage.content).toBe("Hello World");
  });

  it("handles empty string", () => {
    const conv = makeApiConversation({
      platform: "email",
      last_message: {
        id: "e4",
        text: "",
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        platform_message_id: "email-4",
      },
    });
    const [chat] = convertApiConversationsToChatFormat([conv]);
    expect(chat.lastMessage.content).toBe("");
  });

  it("does not strip HTML from non-email platform", () => {
    const conv = makeApiConversation({
      platform: "facebook",
      last_message: {
        id: "f1",
        text: "<b>Bold</b>",
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        platform_message_id: "fb-1",
      },
    });
    const [chat] = convertApiConversationsToChatFormat([conv]);
    expect(chat.lastMessage.content).toBe("<b>Bold</b>");
  });
});

// ---------------------------------------------------------------------------
// convertFacebookMessagesToChatFormat
// ---------------------------------------------------------------------------

describe("convertFacebookMessagesToChatFormat", () => {
  it("converts a conversation with messages", () => {
    const conv = makeUnifiedConversation();
    const msgs = [makeUnifiedMessage()];
    const map = new Map([["conv_1", msgs]]);

    const result = convertFacebookMessagesToChatFormat([conv], map);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("conv_1");
    expect(result[0].name).toBe("John Doe");
    expect(result[0].platform).toBe("facebook");
    expect(result[0].messages).toHaveLength(1);
  });

  it("creates customer and business users", () => {
    const conv = makeUnifiedConversation();
    const msgs = [makeUnifiedMessage()];
    const map = new Map([["conv_1", msgs]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.users).toHaveLength(2);
    expect(chat.users[0].id).toBe("sender_1");
    expect(chat.users[0].name).toBe("John Doe");
    expect(chat.users[1].id).toBe("business");
    expect(chat.users[1].name).toBe("My Page");
  });

  it("sets senderId based on is_from_business flag", () => {
    const conv = makeUnifiedConversation();
    const incoming = makeUnifiedMessage({ id: "m1", is_from_business: false });
    const outgoing = makeUnifiedMessage({ id: "m2", is_from_business: true });
    const map = new Map([["conv_1", [incoming, outgoing]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].senderId).toBe("sender_1");
    expect(chat.messages[1].senderId).toBe("business");
  });

  it("calculates message status for business messages", () => {
    const conv = makeUnifiedConversation();
    const sent = makeUnifiedMessage({ id: "m1", is_from_business: true });
    const delivered = makeUnifiedMessage({ id: "m2", is_from_business: true, is_delivered: true });
    const read = makeUnifiedMessage({ id: "m3", is_from_business: true, is_read: true });
    const map = new Map([["conv_1", [sent, delivered, read]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].status).toBe("SENT");
    expect(chat.messages[1].status).toBe("DELIVERED");
    expect(chat.messages[2].status).toBe("READ");
  });

  it("sorts messages by date (oldest first)", () => {
    const conv = makeUnifiedConversation();
    const older = makeUnifiedMessage({ id: "m1", timestamp: "2024-06-01T09:00:00Z" });
    const newer = makeUnifiedMessage({ id: "m2", timestamp: "2024-06-01T11:00:00Z" });
    const map = new Map([["conv_1", [newer, older]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].id).toBe("m1");
    expect(chat.messages[1].id).toBe("m2");
  });

  it("sorts chats by last message time (newest first)", () => {
    const older = makeUnifiedConversation({
      conversation_id: "old",
      last_message: makeUnifiedMessage({ timestamp: "2024-06-01T08:00:00Z" }),
    });
    const newer = makeUnifiedConversation({
      conversation_id: "new",
      last_message: makeUnifiedMessage({ timestamp: "2024-06-01T12:00:00Z" }),
    });
    const map = new Map<string, any[]>();

    const result = convertFacebookMessagesToChatFormat([older, newer], map);

    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("old");
  });

  it("handles conversation with empty messages", () => {
    const conv = makeUnifiedConversation();
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages).toHaveLength(0);
    expect(chat.messagesLoaded).toBe(true); // Non-email always true
  });

  it("sets messagesLoaded=false for email with no messages", () => {
    const conv = makeUnifiedConversation({ platform: "email" });
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messagesLoaded).toBe(false);
  });

  it("handles image attachments", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      attachment_type: "image",
      attachment_url: "https://example.com/photo.jpg",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].images).toHaveLength(1);
    expect(chat.messages[0].images![0].url).toBe("https://example.com/photo.jpg");
    expect(chat.messages[0].images![0].type).toBe("image");
  });

  it("handles video attachments as images with type 'video'", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      attachment_type: "video",
      attachment_url: "https://example.com/video.mp4",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].images).toHaveLength(1);
    expect(chat.messages[0].images![0].type).toBe("video");
  });

  it("handles audio attachments as voiceMessage", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      attachment_type: "audio",
      attachment_url: "https://example.com/audio.mp3",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].voiceMessage).toBeDefined();
    expect(chat.messages[0].voiceMessage!.url).toBe("https://example.com/audio.mp3");
  });

  it("handles file attachments (non-image/video/audio)", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      attachment_type: "file",
      attachment_url: "https://example.com/doc.pdf",
      attachments: [{ type: "file", url: "https://example.com/doc.pdf", filename: "doc.pdf" }],
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].files).toHaveLength(1);
    expect(chat.messages[0].files![0].name).toBe("doc.pdf");
  });

  it("handles email attachments as files", () => {
    const conv = makeUnifiedConversation({ platform: "email" });
    const msg = makeUnifiedMessage({
      platform: "email",
      attachments: [
        { type: "image", url: "https://example.com/logo.png", filename: "logo.png" },
        { type: "file", url: "https://example.com/doc.pdf", filename: "doc.pdf" },
      ],
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    // For emails, ALL attachments become files
    expect(chat.messages[0].files).toHaveLength(2);
    expect(chat.messages[0].images).toBeUndefined();
  });

  it("computes unread count from conversation", () => {
    const conv = makeUnifiedConversation({ unread_count: 5 });
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.unreadCount).toBe(5);
  });

  it("infers unread=1 when last message from customer is unread", () => {
    const conv = makeUnifiedConversation({
      unread_count: 0,
      last_message: makeUnifiedMessage({
        is_from_business: false,
        is_read: false,
      }),
    });
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.unreadCount).toBe(1);
  });

  it("unread=0 when last message from business", () => {
    const conv = makeUnifiedConversation({
      unread_count: 0,
      last_message: makeUnifiedMessage({ is_from_business: true }),
    });
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.unreadCount).toBe(0);
  });

  it("shows attachment label for attachment-only last message", () => {
    const conv = makeUnifiedConversation({
      last_message: makeUnifiedMessage({
        message_text: "",
        attachment_type: "image",
      }),
    });
    const map = new Map<string, any[]>();

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.lastMessage.content).toContain("Image");
  });

  it("resolves reply_to references", () => {
    const conv = makeUnifiedConversation();
    const original = makeUnifiedMessage({ id: "1", message_text: "Original" });
    const reply = makeUnifiedMessage({
      id: "2",
      message_text: "Reply",
      reply_to_id: 1,
      timestamp: "2024-06-01T11:00:00Z",
    });
    const map = new Map([["conv_1", [original, reply]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[1].replyToText).toBe("Original");
  });

  it("preserves source and echo fields", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      source: "echodesk",
      is_echo: true,
      sent_by_name: "Agent Smith",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].source).toBe("echodesk");
    expect(chat.messages[0].isEcho).toBe(true);
    expect(chat.messages[0].sentByName).toBe("Agent Smith");
  });

  it("preserves edit fields", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      is_edited: true,
      edited_at: "2024-06-01T12:00:00Z",
      original_text: "Typo",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].isEdited).toBe(true);
    expect(chat.messages[0].editedAt).toBeInstanceOf(Date);
    expect(chat.messages[0].originalText).toBe("Typo");
  });

  it("preserves reaction fields", () => {
    const conv = makeUnifiedConversation();
    const msg = makeUnifiedMessage({
      reaction: "love",
      reaction_emoji: "❤️",
      reacted_by: "sender_1",
      reacted_at: "2024-06-01T12:00:00Z",
    });
    const map = new Map([["conv_1", [msg]]]);

    const [chat] = convertFacebookMessagesToChatFormat([conv], map);

    expect(chat.messages[0].reaction).toBe("love");
    expect(chat.messages[0].reactionEmoji).toBe("❤️");
    expect(chat.messages[0].reactedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// convertSingleConversation
// ---------------------------------------------------------------------------

describe("convertSingleConversation", () => {
  it("converts a single conversation with messages", () => {
    const conv = makeUnifiedConversation();
    const msgs = [makeUnifiedMessage()];

    const chat = convertSingleConversation(conv, msgs);

    expect(chat.id).toBe("conv_1");
    expect(chat.messages).toHaveLength(1);
  });

  it("works with empty messages", () => {
    const conv = makeUnifiedConversation();

    const chat = convertSingleConversation(conv, []);

    expect(chat.messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// convertUnifiedMessagesToMessageType
// ---------------------------------------------------------------------------

describe("convertUnifiedMessagesToMessageType", () => {
  it("converts messages to MessageType array", () => {
    const msgs = [
      makeUnifiedMessage({ id: "m1" }),
      makeUnifiedMessage({ id: "m2", timestamp: "2024-06-01T11:00:00Z" }),
    ];

    const result = convertUnifiedMessagesToMessageType(msgs);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
    expect(result[1].id).toBe("m2");
  });

  it("sorts by date (oldest first)", () => {
    const msgs = [
      makeUnifiedMessage({ id: "newer", timestamp: "2024-06-01T12:00:00Z" }),
      makeUnifiedMessage({ id: "older", timestamp: "2024-06-01T08:00:00Z" }),
    ];

    const result = convertUnifiedMessagesToMessageType(msgs);

    expect(result[0].id).toBe("older");
    expect(result[1].id).toBe("newer");
  });

  it("sets senderId to 'business' for business messages", () => {
    const msg = makeUnifiedMessage({ is_from_business: true });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.senderId).toBe("business");
  });

  it("sets senderId to sender_id for customer messages", () => {
    const msg = makeUnifiedMessage({ is_from_business: false, sender_id: "cust_42" });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.senderId).toBe("cust_42");
  });

  it("handles image attachments", () => {
    const msg = makeUnifiedMessage({
      attachment_type: "image",
      attachment_url: "https://example.com/img.jpg",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.images).toHaveLength(1);
    expect(result.images![0].type).toBe("image");
  });

  it("handles sticker as image type", () => {
    const msg = makeUnifiedMessage({
      attachment_type: "sticker",
      attachment_url: "https://example.com/sticker.png",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.images).toHaveLength(1);
    expect(result.images![0].type).toBe("image");
  });

  it("handles audio as voiceMessage", () => {
    const msg = makeUnifiedMessage({
      attachment_type: "audio",
      attachment_url: "https://example.com/voice.ogg",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.voiceMessage).toBeDefined();
    expect(result.voiceMessage!.url).toBe("https://example.com/voice.ogg");
  });

  it("handles email attachments as files", () => {
    const msg = makeUnifiedMessage({
      platform: "email",
      attachments: [
        { type: "image", url: "https://example.com/img.png", filename: "img.png" },
      ],
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.files).toHaveLength(1);
    expect(result.files![0].name).toBe("img.png");
    expect(result.images).toBeUndefined();
  });

  it("handles audio via message_type when attachment_url comes from attachments array", () => {
    // This mirrors how loadChatMessages converts WhatsApp audio:
    // attachment_type = msg.message_type ('audio'), attachment_url = proxyUrl
    const msg = makeUnifiedMessage({
      attachment_type: "audio",
      attachment_url: "https://api.echodesk.ge/api/social/whatsapp-media/123/?waba_id=456",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.voiceMessage).toBeDefined();
    expect(result.voiceMessage!.url).toBe("https://api.echodesk.ge/api/social/whatsapp-media/123/?waba_id=456");
    expect(result.files).toBeUndefined();
    expect(result.images).toBeUndefined();
  });

  it("handles video via message_type as images with type video", () => {
    const msg = makeUnifiedMessage({
      attachment_type: "video",
      attachment_url: "https://example.com/clip.mp4",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.images).toHaveLength(1);
    expect(result.images![0].type).toBe("video");
    expect(result.files).toBeUndefined();
    expect(result.voiceMessage).toBeUndefined();
  });

  it("shows placeholder text for audio without URL", () => {
    const msg = makeUnifiedMessage({
      message_text: "",
      attachments: [{ type: "audio" }],
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.text).toContain("Audio sent");
  });

  it("falls back to second attachments scan when first attachment has no url", () => {
    const msg = makeUnifiedMessage({
      attachment_type: undefined,
      attachment_url: undefined,
      message_type: undefined,
      attachments: [
        { type: "image" }, // no url in first position
        { type: "image", url: "https://example.com/fallback.jpg" }, // url in second
      ],
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    // First fallback sets attachmentUrl = msg.attachments[0].url → undefined
    // Second fallback finds attachments[1] which has a url, type=image
    // Filter keeps only attachments with url AND image type → 1 image
    expect(result.images).toHaveLength(1);
    expect(result.images![0].url).toBe("https://example.com/fallback.jpg");
  });

  it("shows placeholder text for attachments without URL", () => {
    const msg = makeUnifiedMessage({
      message_text: "",
      attachments: [{ type: "image" }],
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.text).toContain("Image sent");
  });

  it("resolves reply_to references", () => {
    const original = makeUnifiedMessage({ id: "1", message_text: "Original" });
    const reply = makeUnifiedMessage({
      id: "2",
      message_text: "Reply",
      reply_to_id: 1,
      timestamp: "2024-06-01T11:00:00Z",
    });

    const result = convertUnifiedMessagesToMessageType([original, reply]);

    expect(result[1].replyToText).toBe("Original");
  });

  it("preserves email fields", () => {
    const msg = makeUnifiedMessage({
      platform: "email",
      subject: "Re: Hello",
      body_html: "<p>Content</p>",
    });

    const [result] = convertUnifiedMessagesToMessageType([msg]);

    expect(result.subject).toBe("Re: Hello");
    expect(result.bodyHtml).toBe("<p>Content</p>");
    expect(result.platform).toBe("email");
  });
});

// ---------------------------------------------------------------------------
// convertApiConversationsToChatFormat
// ---------------------------------------------------------------------------

describe("convertApiConversationsToChatFormat", () => {
  it("converts API conversations to ChatType array", () => {
    const conv = makeApiConversation();

    const result = convertApiConversationsToChatFormat([conv]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("conv_1");
    expect(result[0].name).toBe("John Doe");
    expect(result[0].platform).toBe("facebook");
  });

  it("messages are empty (lazy loaded)", () => {
    const conv = makeApiConversation();

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.messages).toEqual([]);
    expect(chat.messagesLoaded).toBe(false);
  });

  it("creates customer and business users", () => {
    const conv = makeApiConversation();

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.users).toHaveLength(2);
    expect(chat.users[0].id).toBe("sender_1");
    expect(chat.users[1].id).toBe("business");
  });

  it("handles null sender_name", () => {
    const conv = makeApiConversation({ sender_name: null });

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.name).toBe("Unknown");
  });

  it("handles null profile_pic_url", () => {
    const conv = makeApiConversation({ profile_pic_url: null });

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.avatar).toBeUndefined();
  });

  it("preserves unread_count", () => {
    const conv = makeApiConversation({ unread_count: 3 });

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.unreadCount).toBe(3);
  });

  it("shows attachment label when text is null", () => {
    const conv = makeApiConversation({
      last_message: {
        id: "a1",
        text: null,
        timestamp: "2024-06-01T10:00:00Z",
        is_from_business: false,
        attachment_type: "video",
        platform_message_id: "mid-a1",
      },
    });

    const [chat] = convertApiConversationsToChatFormat([conv]);

    expect(chat.lastMessage.content).toContain("Video");
  });

  it("sorts by last message time (newest first)", () => {
    const older = makeApiConversation({
      conversation_id: "old",
      last_message: {
        id: "o1",
        text: "Old",
        timestamp: "2024-01-01T00:00:00Z",
        is_from_business: false,
        platform_message_id: "old-1",
      },
    });
    const newer = makeApiConversation({
      conversation_id: "new",
      last_message: {
        id: "n1",
        text: "New",
        timestamp: "2024-12-01T00:00:00Z",
        is_from_business: false,
        platform_message_id: "new-1",
      },
    });

    const result = convertApiConversationsToChatFormat([older, newer]);

    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("old");
  });

  it("handles empty conversations array", () => {
    const result = convertApiConversationsToChatFormat([]);
    expect(result).toEqual([]);
  });
});
