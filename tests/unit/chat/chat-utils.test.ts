/**
 * Tests for chat utility functions.
 *
 * Covers:
 * - parseChatId: composite chat ID parsing for all platforms
 * - Edge cases: malformed IDs, missing parts, unknown prefixes
 */

import { describe, it, expect } from "vitest";
import { parseChatId } from "@/lib/chatUtils";

// ---------------------------------------------------------------------------
// Tests: parseChatId
// ---------------------------------------------------------------------------

describe("parseChatId", () => {
  describe("Facebook (fb_ prefix)", () => {
    it("parses fb_{page_id}_{sender_id}", () => {
      const result = parseChatId("fb_123456_789012");
      expect(result).toEqual({
        platform: "facebook",
        accountId: "123456",
        conversationId: "789012",
      });
    });

    it("handles sender_id with underscores", () => {
      const result = parseChatId("fb_123_sender_with_underscores");
      expect(result).toEqual({
        platform: "facebook",
        accountId: "123",
        conversationId: "sender_with_underscores",
      });
    });
  });

  describe("Instagram (ig_ prefix)", () => {
    it("parses ig_{account_id}_{sender_id}", () => {
      const result = parseChatId("ig_111_222");
      expect(result).toEqual({
        platform: "instagram",
        accountId: "111",
        conversationId: "222",
      });
    });
  });

  describe("WhatsApp (wa_ prefix)", () => {
    it("parses wa_{waba_id}_{from_number}", () => {
      const result = parseChatId("wa_waba123_995599123456");
      expect(result).toEqual({
        platform: "whatsapp",
        accountId: "waba123",
        conversationId: "995599123456",
      });
    });
  });

  describe("Email (email_ prefix)", () => {
    it("parses email_{connection_id}_{thread_id}", () => {
      const result = parseChatId("email_conn1_thread42");
      expect(result).toEqual({
        platform: "email",
        accountId: "conn1",
        conversationId: "thread42",
      });
    });

    it("handles thread_id with underscores", () => {
      const result = parseChatId("email_conn1_thread_42_abc");
      expect(result).toEqual({
        platform: "email",
        accountId: "conn1",
        conversationId: "thread_42_abc",
      });
    });
  });

  describe("Platform override", () => {
    it("uses provided platform instead of prefix-based detection", () => {
      const result = parseChatId("fb_123_456", "instagram");
      expect(result).toEqual({
        platform: "instagram",
        accountId: "123",
        conversationId: "456",
      });
    });

    it("overrides prefix with whatsapp platform", () => {
      const result = parseChatId("ig_123_456", "whatsapp");
      expect(result).toEqual({
        platform: "whatsapp",
        accountId: "123",
        conversationId: "456",
      });
    });
  });

  describe("Invalid / edge cases", () => {
    it("returns null for empty string", () => {
      expect(parseChatId("")).toBeNull();
    });

    it("returns null for single segment (no underscores)", () => {
      expect(parseChatId("fb")).toBeNull();
    });

    it("returns null for two segments (needs at least 3 parts)", () => {
      expect(parseChatId("fb_123")).toBeNull();
    });

    it("returns null for unknown prefix without platform override", () => {
      expect(parseChatId("xx_123_456")).toBeNull();
    });

    it("returns valid result for unknown prefix with platform override", () => {
      const result = parseChatId("xx_123_456", "facebook");
      expect(result).toEqual({
        platform: "facebook",
        accountId: "123",
        conversationId: "456",
      });
    });

    it("handles numeric-only IDs", () => {
      const result = parseChatId("fb_12345_67890");
      expect(result).toEqual({
        platform: "facebook",
        accountId: "12345",
        conversationId: "67890",
      });
    });
  });
});
