/**
 * Tests for ItemListService.
 * Frontend counterpart of backend test_itemlist_views.py public endpoints.
 * Mocks @/api/axios (raw axios, not generated API).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axiosInstance from "@/api/axios";
import { itemListService } from "@/services/itemListService";

const mockGet = vi.mocked(axiosInstance.get);

describe("ItemListService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- getPublicItemLists --
  describe("getPublicItemLists", () => {
    it("fetches from correct URL", async () => {
      mockGet.mockResolvedValue({ data: [{ id: 1, title: "Price List" }] });

      await itemListService.getPublicItemLists();

      expect(mockGet).toHaveBeenCalledWith("/api/item-lists/public/");
    });

    it("returns empty array", async () => {
      mockGet.mockResolvedValue({ data: [] });

      const result = await itemListService.getPublicItemLists();

      expect(result).toEqual([]);
    });

    it("throws on error", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));

      await expect(itemListService.getPublicItemLists()).rejects.toThrow(
        "Network error"
      );
    });
  });

  // -- getPublicItemListItems --
  describe("getPublicItemListItems", () => {
    it("fetches with list ID in URL", async () => {
      mockGet.mockResolvedValue({
        data: [{ id: 1, label: "Item 1" }],
      });

      await itemListService.getPublicItemListItems(42);

      expect(mockGet).toHaveBeenCalledWith(
        "/api/item-lists/42/public_items/"
      );
    });

    it("returns empty array", async () => {
      mockGet.mockResolvedValue({ data: [] });

      const result = await itemListService.getPublicItemListItems(1);

      expect(result).toEqual([]);
    });

    it("handles 404", async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: { detail: "Not found" } },
      });

      await expect(
        itemListService.getPublicItemListItems(999)
      ).rejects.toBeDefined();
    });
  });
});
