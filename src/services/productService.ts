/**
 * Product Service
 * Wrapper around generated API for product management
 */

import {
  apiEcommerceAdminProductsList,
  apiEcommerceAdminProductsRetrieve,
  apiEcommerceAdminProductsCreate,
  apiEcommerceAdminProductsPartialUpdate,
  apiEcommerceAdminProductsDestroy,
} from "@/api/generated";

import type {
  PaginatedProductListList,
  ProductDetail,
  ProductCreateUpdate,
  PatchedProductCreateUpdate,
} from "@/api/generated";

export interface ProductFilters {
  status?: 'active' | 'draft' | 'inactive' | 'out_of_stock';
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
  low_stock?: boolean;
  ordering?: string;
  page?: number;
}

class ProductService {
  /**
   * Get paginated list of products with filters
   */
  async getProducts(filters?: ProductFilters): Promise<PaginatedProductListList> {
    return apiEcommerceAdminProductsList(
      filters?.in_stock,
      filters?.is_featured,
      filters?.low_stock,
      filters?.max_price,
      filters?.min_price,
      filters?.ordering,
      filters?.page,
      filters?.search,
      filters?.status
    );
  }

  /**
   * Get product detail by ID
   */
  async getProduct(id: number): Promise<ProductDetail> {
    return apiEcommerceAdminProductsRetrieve(id);
  }

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreateUpdate): Promise<ProductCreateUpdate> {
    return apiEcommerceAdminProductsCreate(data);
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: number,
    data: PatchedProductCreateUpdate
  ): Promise<PatchedProductCreateUpdate> {
    return apiEcommerceAdminProductsPartialUpdate(id, data);
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<void> {
    return apiEcommerceAdminProductsDestroy(id);
  }
}

export const productService = new ProductService();
