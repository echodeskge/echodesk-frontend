/**
 * Product Service
 * Wrapper around generated API for product management
 */

import {
  ecommerceAdminProductsList,
  ecommerceAdminProductsRetrieve,
  ecommerceAdminProductsCreate,
  ecommerceAdminProductsPartialUpdate,
  ecommerceAdminProductsDestroy,
} from "@/api/generated";

import type {
  PaginatedProductListList,
  ProductDetail,
  ProductCreateUpdate,
  PatchedProductCreateUpdateRequest,
} from "@/api/generated";

export interface ProductFilters {
  status?: 'active' | 'draft' | 'inactive' | 'out_of_stock';
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
  low_stock?: boolean;
  attributes?: string; // Format: "color:red,size:large"
  ordering?: string;
  page?: number;
  page_size?: number; // Items per page (default: 20, max: 100)
}

/**
 * Helper function to build attributes filter string
 * @param attributesObj Object with attribute keys and values
 * @returns Formatted string "key1:value1,key2:value2"
 * @example
 * buildAttributesFilter({ color: 'red', size: 'large' }) // Returns "color:red,size:large"
 */
export function buildAttributesFilter(attributesObj: Record<string, string>): string {
  return Object.entries(attributesObj)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
}

class ProductService {
  /**
   * Get paginated list of products with filters
   */
  async getProducts(filters?: ProductFilters): Promise<PaginatedProductListList> {
    // Build query params manually to include attributes filter
    const params = new URLSearchParams();

    if (filters?.in_stock !== undefined) params.append('in_stock', String(filters.in_stock));
    if (filters?.is_featured !== undefined) params.append('is_featured', String(filters.is_featured));
    if (filters?.low_stock !== undefined) params.append('low_stock', String(filters.low_stock));
    if (filters?.max_price !== undefined) params.append('max_price', String(filters.max_price));
    if (filters?.min_price !== undefined) params.append('min_price', String(filters.min_price));
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.attributes) params.append('attributes', filters.attributes);

    const queryString = params.toString();
    const url = `/api/ecommerce/admin/products/${queryString ? `?${queryString}` : ''}`;

    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedProductListList>(url);
    return response.data;
  }

  /**
   * Get product detail by ID
   */
  async getProduct(id: number): Promise<ProductDetail> {
    return ecommerceAdminProductsRetrieve(id);
  }

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreateUpdate): Promise<ProductCreateUpdate> {
    return ecommerceAdminProductsCreate(data);
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: number,
    data: PatchedProductCreateUpdateRequest
  ): Promise<PatchedProductCreateUpdateRequest> {
    return ecommerceAdminProductsPartialUpdate(id, data);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<void> {
    return ecommerceAdminProductsDestroy(id);
  }
}

export const productService = new ProductService();
