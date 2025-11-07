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
  ordering?: string;
  page?: number;
}

class ProductService {
  /**
   * Get paginated list of products with filters
   */
  async getProducts(filters?: ProductFilters): Promise<PaginatedProductListList> {
    return ecommerceAdminProductsList(
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
