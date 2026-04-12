/**
 * Tests for AttributeService.
 * Mocks the generated API functions and validates CRUD operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/generated", () => ({
  ecommerceAdminAttributesList: vi.fn(),
  ecommerceAdminAttributesRetrieve: vi.fn(),
  ecommerceAdminAttributesCreate: vi.fn(),
  ecommerceAdminAttributesPartialUpdate: vi.fn(),
  ecommerceAdminAttributesDestroy: vi.fn(),
}));

import { attributeService } from "@/services/attributeService";
import {
  ecommerceAdminAttributesList,
  ecommerceAdminAttributesRetrieve,
  ecommerceAdminAttributesCreate,
  ecommerceAdminAttributesPartialUpdate,
  ecommerceAdminAttributesDestroy,
} from "@/api/generated";

const mockList = vi.mocked(ecommerceAdminAttributesList);
const mockRetrieve = vi.mocked(ecommerceAdminAttributesRetrieve);
const mockCreate = vi.mocked(ecommerceAdminAttributesCreate);
const mockUpdate = vi.mocked(ecommerceAdminAttributesPartialUpdate);
const mockDestroy = vi.mocked(ecommerceAdminAttributesDestroy);

describe("AttributeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAttributes", () => {
    it("calls list API with no filters", async () => {
      mockList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesList>>);

      await attributeService.getAttributes();

      expect(mockList).toHaveBeenCalledWith(
        undefined, // attribute_type
        undefined, // is_filterable
        undefined, // ordering
        undefined, // page
        undefined, // page_size
        undefined  // search
      );
    });

    it("passes filters to list API", async () => {
      mockList.mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: "Color" }],
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesList>>);

      await attributeService.getAttributes({
        attribute_type: "multiselect",
        is_filterable: true,
        search: "color",
        ordering: "name",
        page: 2,
      });

      expect(mockList).toHaveBeenCalledWith(
        "multiselect",
        true,
        "name",
        2,
        undefined,
        "color"
      );
    });

    it("returns paginated result", async () => {
      const mockResult = {
        count: 2,
        results: [
          { id: 1, name: "Color" },
          { id: 2, name: "Size" },
        ],
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesList>>;
      mockList.mockResolvedValue(mockResult);

      const result = await attributeService.getAttributes();

      expect(result).toEqual(mockResult);
    });

    it("throws on error", async () => {
      mockList.mockRejectedValue(new Error("Server error"));

      await expect(attributeService.getAttributes()).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("getAttribute", () => {
    it("calls retrieve API with ID", async () => {
      mockRetrieve.mockResolvedValue({
        id: 1,
        name: "Color",
        attribute_type: "multiselect",
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesRetrieve>>);

      const result = await attributeService.getAttribute(1);

      expect(mockRetrieve).toHaveBeenCalledWith(1);
      expect(result.name).toBe("Color");
    });

    it("throws on not found", async () => {
      mockRetrieve.mockRejectedValue(new Error("Not found"));

      await expect(attributeService.getAttribute(999)).rejects.toThrow(
        "Not found"
      );
    });
  });

  describe("createAttribute", () => {
    it("calls create API with data", async () => {
      const attributeData = {
        name: "Material",
        attribute_type: "multiselect",
      } as Parameters<typeof attributeService.createAttribute>[0];

      mockCreate.mockResolvedValue({
        id: 3,
        ...attributeData,
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesCreate>>);

      const result = await attributeService.createAttribute(attributeData);

      expect(mockCreate).toHaveBeenCalledWith(attributeData);
      expect(result.id).toBe(3);
    });

    it("throws on validation error", async () => {
      mockCreate.mockRejectedValue(new Error("Name already exists"));

      await expect(
        attributeService.createAttribute({
          name: "Duplicate",
        } as Parameters<typeof attributeService.createAttribute>[0])
      ).rejects.toThrow("Name already exists");
    });
  });

  describe("updateAttribute", () => {
    it("calls partial update API with id and data", async () => {
      const updateData = { name: "Updated Color" };

      mockUpdate.mockResolvedValue({
        name: "Updated Color",
      } as Awaited<ReturnType<typeof ecommerceAdminAttributesPartialUpdate>>);

      const result = await attributeService.updateAttribute(1, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(1, updateData);
      expect(result.name).toBe("Updated Color");
    });
  });

  describe("deleteAttribute", () => {
    it("calls destroy API with ID", async () => {
      mockDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof ecommerceAdminAttributesDestroy>>
      );

      await attributeService.deleteAttribute(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });

    it("throws on delete error", async () => {
      mockDestroy.mockRejectedValue(new Error("Cannot delete"));

      await expect(attributeService.deleteAttribute(1)).rejects.toThrow(
        "Cannot delete"
      );
    });
  });
});
