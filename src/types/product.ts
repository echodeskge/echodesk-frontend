/**
 * Product Management Types
 * E-commerce CRM feature types for products, categories, and attributes
 */

export type AttributeType =
  | "multiselect"
  | "number";

export type ProductStatus = "draft" | "active" | "inactive" | "out_of_stock";

export interface MultiLanguageField {
  en?: string;
  ka?: string;
  ru?: string;
  [key: string]: string | undefined;
}

export interface ProductCategory {
  id: number;
  name: MultiLanguageField;
  description: MultiLanguageField;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: ProductCategory[];
}

export interface AttributeDefinition {
  id: number;
  name: MultiLanguageField;
  key: string;
  attribute_type: AttributeType;
  options: any[];
  unit: string;
  is_required: boolean;
  is_filterable: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductType {
  id: number;
  name: MultiLanguageField;
  key: string;
  description: MultiLanguageField;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  attributes?: AttributeDefinition[];
  product_count?: number;
}

export interface ProductAttributeValue {
  id: number;
  attribute: AttributeDefinition;
  attribute_id?: number;
  value: any;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string;
  value_json?: any;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: MultiLanguageField;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: MultiLanguageField;
  price: string | null;
  effective_price: string;
  quantity: number;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  attribute_values: any[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  sku: string;
  slug: string;
  name: MultiLanguageField;
  description: MultiLanguageField;
  short_description: MultiLanguageField;
  product_type: number;
  product_type_name?: string;
  product_type_detail?: ProductType;
  category: number | null;
  category_name?: string | null;
  category_detail?: ProductCategory | null;
  price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  discount_percentage?: number;
  image: string | null;
  images?: ProductImage[];
  track_inventory: boolean;
  quantity: number;
  low_stock_threshold: number;
  is_low_stock?: boolean;
  is_in_stock?: boolean;
  status: ProductStatus;
  is_featured: boolean;
  weight: string | null;
  dimensions: Record<string, any>;
  meta_title: MultiLanguageField;
  meta_description: MultiLanguageField;
  attribute_values?: ProductAttributeValue[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_name?: string | null;
  updated_by: number | null;
  updated_by_name?: string | null;
}

export interface ProductListItem {
  id: number;
  sku: string;
  slug: string;
  name: MultiLanguageField;
  short_description: MultiLanguageField;
  product_type: number;
  product_type_name: string;
  category: number | null;
  category_name: string | null;
  price: string;
  compare_at_price: string | null;
  discount_percentage: number;
  image: string | null;
  quantity: number;
  status: ProductStatus;
  is_featured: boolean;
  is_low_stock: boolean;
  is_in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  sku: string;
  slug: string;
  name: MultiLanguageField;
  description: MultiLanguageField;
  short_description: MultiLanguageField;
  product_type: number;
  category: number | null;
  price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  image: File | string | null;
  track_inventory: boolean;
  quantity: number;
  low_stock_threshold: number;
  status: ProductStatus;
  is_featured: boolean;
  weight: string | null;
  dimensions: Record<string, any>;
  meta_title: MultiLanguageField;
  meta_description: MultiLanguageField;
  attributes?: Array<{
    attribute_id: number;
    value_text?: string;
    value_number?: number;
    value_boolean?: boolean;
    value_date?: string;
    value_json?: any;
  }>;
}

export interface ProductFilters {
  status?: ProductStatus;
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
}

export interface PaginatedProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListItem[];
}
