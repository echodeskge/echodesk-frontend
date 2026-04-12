/**
 * Tests for pendingMedia.ts.
 * Verifies addPendingMedia, consumePendingMedia, FIFO ordering, and auto-cleanup.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { addPendingMedia, consumePendingMedia } from "@/lib/pendingMedia";

// Mock URL.revokeObjectURL since jsdom doesn't have it
const mockRevokeObjectURL = vi.fn();
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

describe("pendingMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Drain any leftover entries from previous tests by consuming them
    // (the module-level map persists between tests in the same file)
    let entry;
    do {
      entry = consumePendingMedia("chat-1");
    } while (entry);
    do {
      entry = consumePendingMedia("chat-2");
    } while (entry);
    do {
      entry = consumePendingMedia("chat-cleanup");
    } while (entry);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("addPendingMedia and consumePendingMedia", () => {
    it("returns undefined when queue is empty", () => {
      const result = consumePendingMedia("chat-1");

      expect(result).toBeUndefined();
    });

    it("adds and consumes a single media entry", () => {
      addPendingMedia("chat-1", "blob:http://localhost/abc", true, "photo.jpg");

      const result = consumePendingMedia("chat-1");

      expect(result).toEqual({
        blobUrl: "blob:http://localhost/abc",
        isImage: true,
        fileName: "photo.jpg",
      });
    });

    it("returns undefined after consuming the only entry", () => {
      addPendingMedia("chat-1", "blob:http://localhost/abc", true, "photo.jpg");

      consumePendingMedia("chat-1");
      const result = consumePendingMedia("chat-1");

      expect(result).toBeUndefined();
    });

    it("consumes entries in FIFO order", () => {
      addPendingMedia("chat-1", "blob:first", true, "first.jpg");
      addPendingMedia("chat-1", "blob:second", false, "doc.pdf");
      addPendingMedia("chat-1", "blob:third", true, "third.png");

      const first = consumePendingMedia("chat-1");
      expect(first?.blobUrl).toBe("blob:first");
      expect(first?.fileName).toBe("first.jpg");

      const second = consumePendingMedia("chat-1");
      expect(second?.blobUrl).toBe("blob:second");
      expect(second?.isImage).toBe(false);

      const third = consumePendingMedia("chat-1");
      expect(third?.blobUrl).toBe("blob:third");

      const empty = consumePendingMedia("chat-1");
      expect(empty).toBeUndefined();
    });
  });

  describe("separate queues per chatId", () => {
    it("maintains independent queues for different chats", () => {
      addPendingMedia("chat-1", "blob:chat1-media", true, "img1.jpg");
      addPendingMedia("chat-2", "blob:chat2-media", false, "doc.pdf");

      const fromChat1 = consumePendingMedia("chat-1");
      expect(fromChat1?.blobUrl).toBe("blob:chat1-media");

      const fromChat2 = consumePendingMedia("chat-2");
      expect(fromChat2?.blobUrl).toBe("blob:chat2-media");
    });

    it("consuming from one chat does not affect another", () => {
      addPendingMedia("chat-1", "blob:a", true, "a.jpg");
      addPendingMedia("chat-2", "blob:b", true, "b.jpg");

      consumePendingMedia("chat-1");

      // chat-2 should still have its entry
      const fromChat2 = consumePendingMedia("chat-2");
      expect(fromChat2?.blobUrl).toBe("blob:b");
    });
  });

  describe("isImage flag", () => {
    it("preserves isImage=true for images", () => {
      addPendingMedia("chat-1", "blob:img", true, "photo.png");

      const result = consumePendingMedia("chat-1");
      expect(result?.isImage).toBe(true);
    });

    it("preserves isImage=false for non-image files", () => {
      addPendingMedia("chat-1", "blob:doc", false, "report.pdf");

      const result = consumePendingMedia("chat-1");
      expect(result?.isImage).toBe(false);
    });
  });

  describe("auto-cleanup after 60 seconds", () => {
    it("revokes blob URL and removes entry after 60s timeout", () => {
      addPendingMedia(
        "chat-cleanup",
        "blob:http://localhost/cleanup-test",
        true,
        "test.jpg"
      );

      // Advance time by 60 seconds
      vi.advanceTimersByTime(60000);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/cleanup-test"
      );

      // The entry should be removed from the queue
      const result = consumePendingMedia("chat-cleanup");
      expect(result).toBeUndefined();
    });

    it("does not revoke if entry was consumed before timeout", () => {
      addPendingMedia(
        "chat-cleanup",
        "blob:http://localhost/consumed",
        true,
        "test.jpg"
      );

      // Consume immediately
      const consumed = consumePendingMedia("chat-cleanup");
      expect(consumed).toBeDefined();

      // Advance time past the cleanup interval
      vi.advanceTimersByTime(60000);

      // revokeObjectURL should not be called since the entry was already consumed
      // (the cleanup tries to find it but it's gone)
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe("fileName", () => {
    it("preserves fileName", () => {
      addPendingMedia("chat-1", "blob:file", false, "document.docx");

      const result = consumePendingMedia("chat-1");
      expect(result?.fileName).toBe("document.docx");
    });
  });
});
