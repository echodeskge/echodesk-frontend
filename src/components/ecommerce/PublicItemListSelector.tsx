/**
 * Public Item List Selector Component
 * Example component showing how to use public item lists
 * Can be used in ecommerce product forms, checkout, etc.
 */

"use client";

import { useState } from "react";
import { usePublicItemLists, usePublicItemListItems } from "@/hooks/useItemLists";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { ItemList, ListItem } from "@/api/generated";

interface PublicItemListSelectorProps {
  /**
   * Selected item list ID
   */
  listId?: number;

  /**
   * Selected item ID
   */
  itemId?: number;

  /**
   * Callback when item list is selected
   */
  onListChange?: (list: ItemList | null) => void;

  /**
   * Callback when item is selected
   */
  onItemChange?: (item: ListItem | null) => void;

  /**
   * Optional label for the list selector
   */
  listLabel?: string;

  /**
   * Optional label for the item selector
   */
  itemLabel?: string;

  /**
   * Optional placeholder for the list selector
   */
  listPlaceholder?: string;

  /**
   * Optional placeholder for the item selector
   */
  itemPlaceholder?: string;
}

export function PublicItemListSelector({
  listId: initialListId,
  itemId: initialItemId,
  onListChange,
  onItemChange,
  listLabel = "Select List",
  itemLabel = "Select Item",
  listPlaceholder = "Choose a list...",
  itemPlaceholder = "Choose an item...",
}: PublicItemListSelectorProps) {
  const [selectedListId, setSelectedListId] = useState<number | null>(
    initialListId || null
  );
  const [selectedItemId, setSelectedItemId] = useState<number | null>(
    initialItemId || null
  );

  // Fetch public item lists
  const { data: itemLists, isLoading: listsLoading } = usePublicItemLists();

  // Fetch items from selected list
  const { data: items, isLoading: itemsLoading } = usePublicItemListItems(selectedListId);

  const handleListChange = (value: string) => {
    const listId = parseInt(value);
    setSelectedListId(listId);
    setSelectedItemId(null); // Reset item selection when list changes

    const selectedList = itemLists?.find((list) => list.id === listId);
    onListChange?.(selectedList || null);
    onItemChange?.(null); // Reset item callback
  };

  const handleItemChange = (value: string) => {
    const itemId = parseInt(value);
    setSelectedItemId(itemId);

    const selectedItem = items?.find((item) => item.id === itemId);
    onItemChange?.(selectedItem || null);
  };

  if (listsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!itemLists || itemLists.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No public lists available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Item List Selector */}
      <div className="space-y-2">
        <Label>{listLabel}</Label>
        <Select
          value={selectedListId?.toString()}
          onValueChange={handleListChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={listPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {itemLists.map((list) => (
              <SelectItem key={list.id} value={list.id!.toString()}>
                {list.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedListId && itemLists.find((l) => l.id === selectedListId)?.description && (
          <p className="text-xs text-muted-foreground">
            {itemLists.find((l) => l.id === selectedListId)?.description}
          </p>
        )}
      </div>

      {/* Item Selector (only shown when list is selected) */}
      {selectedListId && (
        <div className="space-y-2">
          <Label>{itemLabel}</Label>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : items && items.length > 0 ? (
            <Select
              value={selectedItemId?.toString()}
              onValueChange={handleItemChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={itemPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id!.toString()}>
                    {item.label}
                    {item.custom_id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({item.custom_id})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">
              No items available in this list
            </div>
          )}
        </div>
      )}
    </div>
  );
}
