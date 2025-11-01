/**
 * Product Service
 * Wrapper around generated API for product management
 */

import { MyApi } from "@/api/generated";
import type {
  PaginatedProductListList,
  ProductDetail,
  ProductCreateUpdate,
  PatchedProductCreateUpdate,
  PaginatedProductTypeList,
  ProductType,
  PaginatedProductCategoryList,
  ProductCategory,
  PaginatedAttributeDefinitionList,
  AttributeDefinition,
  ProductImage,
} from "@/api/generated";

export interface ProductFilters {
  status?: string;
  product_type?: number;
  product_type_key?: string;
  category?: number;
  category_slug?: string;
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
  low_stock?: boolean;
  ordering?: string;
  language?: string;
  page?: number;
  page_size?: number;
}

class ProductService {
  /**
   * Get paginated list of products with filters
   */
  async getProducts(filters?: ProductFilters): Promise<PaginatedProductListList> {
    return MyApi.ecommerceProductsList(filters);
  }

  /**
   * Get product detail by ID
   */
  async getProduct(id: number, language?: string): Promise<ProductDetail> {
    return MyApi.ecommerceProductsRetrieve({ id, language });
  }

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreateUpdate): Promise<ProductDetail> {
    return MyApi.ecommerceProductsCreate({ data });
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: number,
    data: PatchedProductCreateUpdate
  ): Promise<ProductDetail> {
    return MyApi.ecommerceProductsPartialUpdate({ id, data });
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<void> {
    return MyApi.ecommerceProductsDestroy({ id });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(language?: string): Promise<PaginatedProductListList> {
    return MyApi.ecommerceProductsFeaturedList({ language });
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(language?: string): Promise<PaginatedProductListList> {
    return MyApi.ecommerceProductsLowStockList({ language });
  }

  /**
   * Add image to product
   */
  async addProductImage(
    productId: number,
    data: FormData
  ): Promise<ProductImage> {
    return MyApi.ecommerceProductsAddImageCreate({ id: productId, data });
  }

  /**
   * Remove image from product
   */
  async removeProductImage(productId: number, imageId: string): Promise<void> {
    return MyApi.ecommerceProductsRemoveImageDestroy({
      id: productId,
      imageId
    });
  }

  /**
   * Update product attributes
   */
  async updateProductAttributes(
    productId: number,
    attributes: Array<{
      attribute_id: number;
      value_text?: string;
      value_number?: number;
      value_boolean?: boolean;
      value_date?: string;
      value_json?: any;
    }>
  ): Promise<ProductDetail> {
    return MyApi.ecommerceProductsUpdateAttributesCreate({
      id: productId,
      data: { attributes },
    });
  }

  // Product Types
  /**
   * Get all product types
   */
  async getProductTypes(filters?: {
    ordering?: string;
    search?: string;
    language?: string;
  }): Promise<PaginatedProductTypeList> {
    return MyApi.ecommerceTypesList(filters);
  }

  /**
   * Get product type detail
   */
  async getProductType(id: number, language?: string): Promise<ProductType> {
    return MyApi.ecommerceTypesRetrieve({ id, language });
  }

  /**
   * Create product type
   */
  async createProductType(data: any): Promise<ProductType> {
    return MyApi.ecommerceTypesCreate({ data });
  }

  /**
   * Update product type
   */
  async updateProductType(id: number, data: any): Promise<ProductType> {
    return MyApi.ecommerceTypesPartialUpdate({ id, data });
  }

  /**
   * Delete product type
   */
  async deleteProductType(id: number): Promise<void> {
    return MyApi.ecommerceTypesDestroy({ id });
  }

  // Categories
  /**
   * Get all categories
   */
  async getCategories(filters?: {
    ordering?: string;
    search?: string;
    language?: string;
  }): Promise<PaginatedProductCategoryList> {
    return MyApi.ecommerceCategoriesList(filters);
  }

  /**
   * Get category tree
   */
  async getCategoryTree(language?: string): Promise<ProductCategory[]> {
    return MyApi.ecommerceCategoriesTreeList({ language });
  }

  /**
   * Get category detail
   */
  async getCategory(id: number, language?: string): Promise<ProductCategory> {
    return MyApi.ecommerceCategoriesRetrieve({ id, language });
  }

  /**
   * Create category
   */
  async createCategory(data: any): Promise<ProductCategory> {
    return MyApi.ecommerceCategoriesCreate({ data });
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: any): Promise<ProductCategory> {
    return MyApi.ecommerceCategoriesPartialUpdate({ id, data });
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    return MyApi.ecommerceCategoriesDestroy({ id });
  }

  // Attributes
  /**
   * Get all attribute definitions
   */
  async getAttributes(filters?: {
    attribute_type?: string;
    is_variant_attribute?: boolean;
    is_filterable?: boolean;
    ordering?: string;
    search?: string;
  }): Promise<PaginatedAttributeDefinitionList> {
    return MyApi.ecommerceAttributesList(filters);
  }

  /**
   * Get attribute detail
   */
  async getAttribute(id: number): Promise<AttributeDefinition> {
    return MyApi.ecommerceAttributesRetrieve({ id });
  }

  /**
   * Create attribute
   */
  async createAttribute(data: any): Promise<AttributeDefinition> {
    return MyApi.ecommerceAttributesCreate({ data });
  }

  /**
   * Update attribute
   */
  async updateAttribute(id: number, data: any): Promise<AttributeDefinition> {
    return MyApi.ecommerceAttributesPartialUpdate({ id, data });
  }

  /**
   * Delete attribute
   */
  async deleteAttribute(id: number): Promise<void> {
    return MyApi.ecommerceAttributesDestroy({ id });
  }
}

export const productService = new ProductService();
