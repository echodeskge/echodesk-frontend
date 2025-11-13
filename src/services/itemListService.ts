/**
 * Item List Service for Ecommerce Clients
 * Handles fetching public item lists without authentication
 */

import axiosInstance from "@/api/axios";
import type { ItemList, ListItem } from "@/api/generated";

export interface PublicItemListsResponse {
  results: ItemList[];
}

export interface PublicItemsResponse {
  results: ListItem[];
}

class ItemListService {
  /**
   * Get all public item lists accessible to ecommerce clients
   * No authentication required
   */
  async getPublicItemLists(): Promise<ItemList[]> {
    const response = await axiosInstance.get<ItemList[]>("/api/item-lists/public/");
    return response.data;
  }

  /**
   * Get items from a specific public item list
   * @param listId - The ID of the public item list
   * No authentication required
   */
  async getPublicItemListItems(listId: number): Promise<ListItem[]> {
    const response = await axiosInstance.get<ListItem[]>(
      `/api/item-lists/${listId}/public_items/`
    );
    return response.data;
  }
}

export const itemListService = new ItemListService();
