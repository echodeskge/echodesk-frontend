/**
 * Tests for ProductService.
 * Frontend counterpart of backend test_ecommerce_views.py:
 *   - Product CRUD operations
 *   - buildAttributesFilter pure function
 *   - Filter parameter building
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/generated/api", () => ({
  ecommerceAdminProductsRetrieve: vi.fn(),
  ecommerceAdminProductsCreate: vi.fn(),
  ecommerceAdminProductsPartialUpdate: vi.fn(),
  ecommerceAdminProductsDestroy: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import {
  productService,
  buildAttributesFilter,
} from "@/services/productService";
import {
  ecommerceAdminProductsRetrieve,
  ecommerceAdminProductsCreate,
  ecommerceAdminProductsPartialUpdate,
  ecommerceAdminProductsDestroy,
} from "@/api/generated/api";
import axios from "@/api/axios";

const mockRetrieve = vi.mocked(ecommerceAdminProductsRetrieve);
const mockCreate = vi.mocked(ecommerceAdminProductsCreate);
const mockPartialUpdate = vi.mocked(ecommerceAdminProductsPartialUpdate);
const mockDestroy = vi.mocked(ecommerceAdminProductsDestroy);
const mockAxiosGet = vi.mocked(axios.get);

type RetrieveReturn = Awaited<ReturnType<typeof ecommerceAdminProductsRetrieve>>;
type CreateReturn = Awaited<ReturnType<typeof ecommerceAdminProductsCreate>>;

describe("buildAttributesFilter", () => {
  it("builds key:value pairs joined by comma", () => {
    expect(buildAttributesFilter({ color: "red", size: "large" })).toBe(
      "color:red,size:large"
    );
  });

  it("returns empty string for empty object", () => {
    expect(buildAttributesFilter({})).toBe("");
  });

  it("handles single entry", () => {
    expect(buildAttributesFilter({ material: "cotton" })).toBe(
      "material:cotton"
    );
  });
});

describe("ProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- getProducts --
  describe("getProducts", () => {
    it("returns paginated product list", async () => {
      const response = {
        data: {
          count: 1,
          results: [{ id: 1, sku: "SKU-1", name: { en: "Test" } }],
        },
      };
      mockAxiosGet.mockResolvedValue(response);

      const result = await productService.getProducts();

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/ecommerce/admin/products/"
      );
    });

    it("passes status filter to URL", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await productService.getProducts({ status: "active" });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining("status=active")
      );
    });

    it("passes search filter to URL", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await productService.getProducts({ search: "widget" });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining("search=widget")
      );
    });

    it("passes multiple filters to URL", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await productService.getProducts({
        status: "draft",
        in_stock: true,
        page: 2,
        page_size: 10,
      });

      const url = mockAxiosGet.mock.calls[0][0] as string;
      expect(url).toContain("status=draft");
      expect(url).toContain("in_stock=true");
      expect(url).toContain("page=2");
      expect(url).toContain("page_size=10");
    });

    it("passes attributes filter to URL", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await productService.getProducts({
        attributes: "color:red,size:large",
      });

      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.stringContaining("attributes=color")
      );
    });

    it("omits undefined filters from URL", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await productService.getProducts({ status: "active" });

      const url = mockAxiosGet.mock.calls[0][0] as string;
      expect(url).not.toContain("search=");
      expect(url).not.toContain("page=");
    });
  });

  // -- getProduct --
  describe("getProduct", () => {
    it("returns product by ID", async () => {
      const product = { id: 1, sku: "DET-001" } as RetrieveReturn;
      mockRetrieve.mockResolvedValue(product);

      const result = await productService.getProduct(1);

      expect(result.sku).toBe("DET-001");
      expect(mockRetrieve).toHaveBeenCalledWith(1);
    });
  });

  // -- createProduct --
  describe("createProduct", () => {
    it("creates product with data", async () => {
      const created = { id: 1, sku: "NEW-001" } as CreateReturn;
      mockCreate.mockResolvedValue(created);

      const result = await productService.createProduct({
        sku: "NEW-001",
        name: { en: "New" },
        price: "29.99",
        status: "draft",
      } as any);

      expect(result.sku).toBe("NEW-001");
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  // -- updateProduct --
  describe("updateProduct", () => {
    it("partial updates product by ID", async () => {
      mockPartialUpdate.mockResolvedValue({ price: "49.99" } as any);

      const result = await productService.updateProduct(1, {
        price: "49.99",
      } as any);

      expect(result.price).toBe("49.99");
      expect(mockPartialUpdate).toHaveBeenCalledWith(1, { price: "49.99" });
    });
  });

  // -- deleteProduct --
  describe("deleteProduct", () => {
    it("deletes product by ID", async () => {
      mockDestroy.mockResolvedValue(undefined);

      await productService.deleteProduct(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });
  });
});
