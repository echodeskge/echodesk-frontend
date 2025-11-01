/**
 * Product Attribute Service
 * Wrapper around generated API for product attribute management
 */

import {
  apiEcommerceAttributesList,
  apiEcommerceAttributesRetrieve,
  apiEcommerceAttributesCreate,
  apiEcommerceAttributesPartialUpdate,
  apiEcommerceAttributesDestroy,
} from "@/api/generated";

import type {
  PaginatedAttributeDefinitionList,
  AttributeDefinition,
  PatchedAttributeDefinition,
} from "@/api/generated";

export interface AttributeFilters {
  attribute_type?: 'boolean' | 'color' | 'date' | 'multiselect' | 'number' | 'select' | 'text';
  is_filterable?: boolean;
  is_variant_attribute?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
}

class AttributeService {
  /**
   * Get paginated list of attribute definitions with filters
   */
  async getAttributes(filters?: AttributeFilters): Promise<PaginatedAttributeDefinitionList> {
    return apiEcommerceAttributesList(
      filters?.attribute_type,
      filters?.is_filterable,
      filters?.is_variant_attribute,
      filters?.ordering,
      filters?.page,
      filters?.search
    );
  }

  /**
   * Get attribute definition by ID
   */
  async getAttribute(id: number): Promise<AttributeDefinition> {
    return apiEcommerceAttributesRetrieve(id);
  }

  /**
   * Create a new attribute definition
   */
  async createAttribute(data: AttributeDefinition): Promise<AttributeDefinition> {
    return apiEcommerceAttributesCreate(data);
  }

  /**
   * Update an existing attribute definition
   */
  async updateAttribute(
    id: number,
    data: PatchedAttributeDefinition
  ): Promise<PatchedAttributeDefinition> {
    return apiEcommerceAttributesPartialUpdate(id, data);
  }

  /**
   * Delete an attribute definition
   */
  async deleteAttribute(id: number): Promise<void> {
    return apiEcommerceAttributesDestroy(id);
  }
}

export const attributeService = new AttributeService();
