/**
 * Tests for email constants and utility functions.
 * Verifies folder icon resolution and virtual folder detection.
 */
import { describe, it, expect } from "vitest";
import {
  getFolderIcon,
  isVirtualFolder,
  FOLDER_ICON_MAP,
  VIRTUAL_FOLDERS,
  PAGE_SIZE,
} from "@/app/(tenant)/email/constants";

describe("email constants", () => {
  // -------------------------------------------------------------------------
  // getFolderIcon
  // -------------------------------------------------------------------------

  describe("getFolderIcon", () => {
    it("returns 'Inbox' for INBOX", () => {
      expect(getFolderIcon("INBOX")).toBe("Inbox");
    });

    it("returns 'Send' for Sent", () => {
      expect(getFolderIcon("Sent")).toBe("Send");
    });

    it("returns 'Pencil' for Draft", () => {
      expect(getFolderIcon("Draft")).toBe("Pencil");
    });

    it("returns 'Pencil' for Drafts", () => {
      expect(getFolderIcon("Drafts")).toBe("Pencil");
    });

    it("returns 'AlertCircle' for Spam", () => {
      expect(getFolderIcon("Spam")).toBe("AlertCircle");
    });

    it("returns 'AlertCircle' for Junk", () => {
      expect(getFolderIcon("Junk")).toBe("AlertCircle");
    });

    it("returns 'Trash2' for Trash", () => {
      expect(getFolderIcon("Trash")).toBe("Trash2");
    });

    it("returns 'Trash2' for Deleted", () => {
      expect(getFolderIcon("Deleted")).toBe("Trash2");
    });

    it("returns 'Archive' for Archive", () => {
      expect(getFolderIcon("Archive")).toBe("Archive");
    });

    it("returns 'Folder' for unknown folder name", () => {
      expect(getFolderIcon("unknown")).toBe("Folder");
    });

    it("returns 'Folder' for empty string", () => {
      expect(getFolderIcon("")).toBe("Folder");
    });

    it("matches case-insensitive partial for [Gmail]/Trash", () => {
      expect(getFolderIcon("[Gmail]/Trash")).toBe("Trash2");
    });

    it("matches case-insensitive partial for [Gmail]/Sent Mail", () => {
      expect(getFolderIcon("[Gmail]/Sent Mail")).toBe("Send");
    });

    it("matches case-insensitive partial for [Gmail]/Spam", () => {
      expect(getFolderIcon("[Gmail]/Spam")).toBe("AlertCircle");
    });

    it("matches case-insensitive partial for [Gmail]/Drafts", () => {
      expect(getFolderIcon("[Gmail]/Drafts")).toBe("Pencil");
    });

    it("matches INBOX pattern first for INBOX.Junk (INBOX wins iteration)", () => {
      // INBOX is iterated first in FOLDER_ICON_MAP, so "inbox.junk" matches "inbox" before "junk"
      expect(getFolderIcon("INBOX.Junk")).toBe("Inbox");
    });

    it("matches INBOX pattern first for INBOX.Archive (INBOX wins iteration)", () => {
      // Same: "inbox.archive" contains "inbox" which is checked first
      expect(getFolderIcon("INBOX.Archive")).toBe("Inbox");
    });
  });

  // -------------------------------------------------------------------------
  // isVirtualFolder
  // -------------------------------------------------------------------------

  describe("isVirtualFolder", () => {
    it("returns true for 'starred'", () => {
      expect(isVirtualFolder("starred")).toBe(true);
    });

    it("returns true for 'drafts'", () => {
      expect(isVirtualFolder("drafts")).toBe(true);
    });

    it("returns false for 'INBOX'", () => {
      expect(isVirtualFolder("INBOX")).toBe(false);
    });

    it("returns false for 'Sent'", () => {
      expect(isVirtualFolder("Sent")).toBe(false);
    });

    it("returns false for 'Trash'", () => {
      expect(isVirtualFolder("Trash")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isVirtualFolder("")).toBe(false);
    });

    it("returns false for 'Starred' (case-sensitive)", () => {
      expect(isVirtualFolder("Starred")).toBe(false);
    });

    it("returns false for 'Drafts' (uppercase D is not virtual)", () => {
      expect(isVirtualFolder("Drafts")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // VIRTUAL_FOLDERS constant
  // -------------------------------------------------------------------------

  describe("VIRTUAL_FOLDERS", () => {
    it("contains exactly 'starred' and 'drafts'", () => {
      expect(VIRTUAL_FOLDERS).toEqual(["starred", "drafts"]);
    });

    it("has length 2", () => {
      expect(VIRTUAL_FOLDERS).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // FOLDER_ICON_MAP constant
  // -------------------------------------------------------------------------

  describe("FOLDER_ICON_MAP", () => {
    it("has entries for all standard IMAP folders", () => {
      const expectedKeys = [
        "INBOX",
        "Sent",
        "Draft",
        "Drafts",
        "Spam",
        "Junk",
        "Trash",
        "Deleted",
        "Archive",
      ];
      for (const key of expectedKeys) {
        expect(FOLDER_ICON_MAP).toHaveProperty(key);
      }
    });
  });

  // -------------------------------------------------------------------------
  // PAGE_SIZE constant
  // -------------------------------------------------------------------------

  describe("PAGE_SIZE", () => {
    it("is 10", () => {
      expect(PAGE_SIZE).toBe(10);
    });
  });
});
