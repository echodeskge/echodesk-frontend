/**
 * Tests for chatUtils (src/lib/chatUtils.ts).
 *
 * Complements tests/unit/chat/chat-utils.test.ts with additional edge cases.
 * Covers:
 * - parseChatId: return shape (ParsedChatId interface)
 * - All platform prefixes: fb, ig, wa, email
 * - Platform override behavior
 * - Boundary and malformed input handling
 */

import { describe, it, expect } from "vitest";
import { parseChatId } from "@/lib/chatUtils";
import type { ParsedChatId } from "@/lib/chatUtils";

describe("chatUtils - parseChatId", () => {
  describe("return type validation", () => {
    it("returns ParsedChatId with correct shape for valid input", () => {
      const result = parseChatId("fb_123_456");
      expect(result).not.toBeNull();

      const parsed = result as ParsedChatId;
      expect(parsed).toHaveProperty("platform");
      expect(parsed).toHaveProperty("accountId");
      expect(parsed).toHaveProperty("conversationId");
    });

    it("returns null for invalid input", () => {
      const result = parseChatId("invalid");
      expect(result).toBeNull();
    });
  });

  describe("Facebook platform", () => {
    it("maps fb prefix to facebook platform", () => {
      const result = parseChatId("fb_page123_user456");
      expect(result?.platform).toBe("facebook");
      expect(result?.accountId).toBe("page123");
      expect(result?.conversationId).toBe("user456");
    });

    it("handles long numeric IDs", () => {
      const result = parseChatId("fb_100000000000000_200000000000000");
      expect(result?.platform).toBe("facebook");
      expect(result?.accountId).toBe("100000000000000");
      expect(result?.conversationId).toBe("200000000000000");
    });
  });

  describe("Instagram platform", () => {
    it("maps ig prefix to instagram platform", () => {
      const result = parseChatId("ig_acct1_sender2");
      expect(result?.platform).toBe("instagram");
    });
  });

  describe("WhatsApp platform", () => {
    it("maps wa prefix to whatsapp platform", () => {
      const result = parseChatId("wa_wabaid_995555123456");
      expect(result?.platform).toBe("whatsapp");
      expect(result?.conversationId).toBe("995555123456");
    });

    it("handles phone numbers with plus signs in conversation ID", () => {
      const result = parseChatId("wa_waba1_+995555123456");
      expect(result?.platform).toBe("whatsapp");
      expect(result?.conversationId).toBe("+995555123456");
    });
  });

  describe("Email platform", () => {
    it("maps email prefix to email platform", () => {
      const result = parseChatId("email_conn1_thread1");
      expect(result?.platform).toBe("email");
    });

    it("preserves complex thread IDs with multiple underscores", () => {
      const result = parseChatId("email_1_thread_abc_def_ghi");
      expect(result?.platform).toBe("email");
      expect(result?.accountId).toBe("1");
      expect(result?.conversationId).toBe("thread_abc_def_ghi");
    });
  });

  describe("platform override", () => {
    it("overrides fb prefix with email platform", () => {
      const result = parseChatId("fb_123_456", "email");
      expect(result?.platform).toBe("email");
    });

    it("works with unknown prefix when platform is provided", () => {
      const result = parseChatId("custom_123_456", "whatsapp");
      expect(result?.platform).toBe("whatsapp");
      expect(result?.accountId).toBe("123");
      expect(result?.conversationId).toBe("456");
    });
  });

  describe("edge cases", () => {
    it("returns null for string with only underscores", () => {
      // "_" splits to ["", ""], which is < 3 parts
      expect(parseChatId("_")).toBeNull();
    });

    it("returns null for two underscores (3 empty parts, unknown prefix)", () => {
      // "__" splits to ["", "", ""], prefix is "" which is unknown
      expect(parseChatId("__")).toBeNull();
    });

    it("handles prefix with empty account and conversation IDs", () => {
      // "fb__" splits to ["fb", "", ""], which has 3 parts
      const result = parseChatId("fb__");
      expect(result?.platform).toBe("facebook");
      expect(result?.accountId).toBe("");
      expect(result?.conversationId).toBe("");
    });

    it("correctly extracts account ID as second segment only", () => {
      const result = parseChatId("wa_account_part1_part2_part3");
      expect(result?.accountId).toBe("account");
      // Everything after second underscore is conversationId
      expect(result?.conversationId).toBe("part1_part2_part3");
    });
  });
});
