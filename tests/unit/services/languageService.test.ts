/**
 * Tests for LanguageService.
 * Mocks the generated API functions and validates CRUD operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/generated", () => ({
  ecommerceAdminLanguagesList: vi.fn(),
  ecommerceAdminLanguagesRetrieve: vi.fn(),
  ecommerceAdminLanguagesCreate: vi.fn(),
  ecommerceAdminLanguagesPartialUpdate: vi.fn(),
  ecommerceAdminLanguagesDestroy: vi.fn(),
}));

import { languageService } from "@/services/languageService";
import {
  ecommerceAdminLanguagesList,
  ecommerceAdminLanguagesRetrieve,
  ecommerceAdminLanguagesCreate,
  ecommerceAdminLanguagesPartialUpdate,
  ecommerceAdminLanguagesDestroy,
} from "@/api/generated";

const mockList = vi.mocked(ecommerceAdminLanguagesList);
const mockRetrieve = vi.mocked(ecommerceAdminLanguagesRetrieve);
const mockCreate = vi.mocked(ecommerceAdminLanguagesCreate);
const mockUpdate = vi.mocked(ecommerceAdminLanguagesPartialUpdate);
const mockDestroy = vi.mocked(ecommerceAdminLanguagesDestroy);

describe("LanguageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLanguages", () => {
    it("calls list API with no filters", async () => {
      mockList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesList>>);

      await languageService.getLanguages();

      expect(mockList).toHaveBeenCalledWith(undefined, undefined);
    });

    it("passes filters to list API", async () => {
      mockList.mockResolvedValue({
        count: 1,
        results: [{ id: 1, code: "en", name: "English" }],
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesList>>);

      await languageService.getLanguages({
        ordering: "-name",
        page: 2,
      });

      expect(mockList).toHaveBeenCalledWith("-name", 2);
    });

    it("returns paginated result", async () => {
      const mockResult = {
        count: 2,
        results: [
          { id: 1, code: "en", name: "English" },
          { id: 2, code: "ka", name: "Georgian" },
        ],
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesList>>;
      mockList.mockResolvedValue(mockResult);

      const result = await languageService.getLanguages();

      expect(result).toEqual(mockResult);
      expect(result.count).toBe(2);
    });

    it("throws on error", async () => {
      mockList.mockRejectedValue(new Error("Server error"));

      await expect(languageService.getLanguages()).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("getLanguage", () => {
    it("calls retrieve API with ID", async () => {
      mockRetrieve.mockResolvedValue({
        id: 1,
        code: "en",
        name: "English",
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesRetrieve>>);

      const result = await languageService.getLanguage(1);

      expect(mockRetrieve).toHaveBeenCalledWith(1);
      expect(result.code).toBe("en");
    });

    it("throws on not found", async () => {
      mockRetrieve.mockRejectedValue(new Error("Not found"));

      await expect(languageService.getLanguage(999)).rejects.toThrow(
        "Not found"
      );
    });
  });

  describe("createLanguage", () => {
    it("calls create API with data", async () => {
      const languageData = {
        code: "de",
        name: "German",
        is_default: false,
      } as Parameters<typeof languageService.createLanguage>[0];

      mockCreate.mockResolvedValue({
        id: 3,
        code: "de",
        name: "German",
        is_default: false,
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesCreate>>);

      const result = await languageService.createLanguage(languageData);

      expect(mockCreate).toHaveBeenCalled();
      expect(result.id).toBe(3);
      expect(result.code).toBe("de");
    });

    it("throws on validation error", async () => {
      mockCreate.mockRejectedValue(new Error("Language already exists"));

      await expect(
        languageService.createLanguage({
          code: "en",
          name: "English",
        } as Parameters<typeof languageService.createLanguage>[0])
      ).rejects.toThrow("Language already exists");
    });
  });

  describe("updateLanguage", () => {
    it("calls partial update API with id and data", async () => {
      const updateData = { name: "British English" };

      mockUpdate.mockResolvedValue({
        id: 1,
        code: "en",
        name: "British English",
      } as Awaited<ReturnType<typeof ecommerceAdminLanguagesPartialUpdate>>);

      const result = await languageService.updateLanguage(1, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(1, updateData);
      expect(result.name).toBe("British English");
    });
  });

  describe("deleteLanguage", () => {
    it("calls destroy API with ID", async () => {
      mockDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof ecommerceAdminLanguagesDestroy>>
      );

      await languageService.deleteLanguage(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });

    it("throws on delete error", async () => {
      mockDestroy.mockRejectedValue(
        new Error("Cannot delete default language")
      );

      await expect(languageService.deleteLanguage(1)).rejects.toThrow(
        "Cannot delete default language"
      );
    });
  });
});
