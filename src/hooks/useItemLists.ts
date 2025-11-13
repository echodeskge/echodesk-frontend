/**
 * Item List Hooks for Ecommerce Clients
 * Public access hooks - no authentication required
 */

import { useQuery } from "@tanstack/react-query";
import { itemListService } from "@/services/itemListService";

/**
 * Fetch all public item lists
 * No authentication required
 */
export function usePublicItemLists() {
  return useQuery({
    queryKey: ["public-item-lists"],
    queryFn: () => itemListService.getPublicItemLists(),
  });
}

/**
 * Fetch items from a specific public item list
 * @param listId - The ID of the item list
 * No authentication required
 */
export function usePublicItemListItems(listId: number | null) {
  return useQuery({
    queryKey: ["public-item-list-items", listId],
    queryFn: () => itemListService.getPublicItemListItems(listId!),
    enabled: !!listId,
  });
}
