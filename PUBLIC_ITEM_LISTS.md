# Public Item Lists for Ecommerce Clients

This document explains how to use public item lists in the ecommerce frontend. Public item lists allow ecommerce clients to access predefined lists and their items without authentication.

## Overview

Public item lists are managed by administrators in the backend. When an item list is marked as `is_public=true`, it becomes accessible to ecommerce clients through public API endpoints.

## Backend Configuration

### Making a List Public

In the backend, administrators can mark item lists as public:

1. Go to Item Lists admin
2. Edit or create an item list
3. Check the "Is Public" checkbox
4. Ensure "Is Active" is also checked
5. Save

Only lists with both `is_public=true` and `is_active=true` will be accessible.

## Frontend Usage

### 1. Using Hooks (Recommended)

```typescript
import { usePublicItemLists, usePublicItemListItems } from "@/hooks/useItemLists";

function MyComponent() {
  // Get all public item lists
  const { data: lists, isLoading } = usePublicItemLists();

  // Get items from a specific list
  const { data: items, isLoading: itemsLoading } = usePublicItemListItems(listId);

  return (
    <div>
      {lists?.map((list) => (
        <div key={list.id}>{list.title}</div>
      ))}
    </div>
  );
}
```

### 2. Using the Service Directly

```typescript
import { itemListService } from "@/services/itemListService";

// Get all public lists
const lists = await itemListService.getPublicItemLists();

// Get items from a specific list
const items = await itemListService.getPublicItemListItems(listId);
```

### 3. Using the Pre-built Component

```typescript
import { PublicItemListSelector } from "@/components/ecommerce/PublicItemListSelector";

function ProductForm() {
  const handleListChange = (list) => {
    console.log("Selected list:", list);
  };

  const handleItemChange = (item) => {
    console.log("Selected item:", item);
  };

  return (
    <PublicItemListSelector
      onListChange={handleListChange}
      onItemChange={handleItemChange}
      listLabel="Product Category"
      itemLabel="Subcategory"
    />
  );
}
```

## API Endpoints

### Get All Public Lists
```
GET /api/item-lists/public/
```
**Authentication:** Not required
**Returns:** Array of public item lists

### Get Items from Public List
```
GET /api/item-lists/{id}/public_items/
```
**Authentication:** Not required
**Parameters:**
- `id` - The item list ID
**Returns:** Array of items from the list

## Use Cases

### 1. Product Categories
Use public item lists to provide product category selection in product creation/editing forms.

```typescript
<PublicItemListSelector
  listLabel="Category"
  itemLabel="Subcategory"
  onItemChange={(item) => {
    // Use selected category in product form
    setProductCategory(item);
  }}
/>
```

### 2. Delivery Options
Provide delivery options to customers during checkout.

```typescript
const { data: deliveryOptions } = usePublicItemListItems(DELIVERY_LIST_ID);

return (
  <select>
    {deliveryOptions?.map((option) => (
      <option key={option.id} value={option.id}>
        {option.label}
      </option>
    ))}
  </select>
);
```

### 3. Size/Color Variants
Use for product variants in ecommerce.

```typescript
// Get size options
const { data: sizes } = usePublicItemListItems(SIZES_LIST_ID);

// Get color options
const { data: colors } = usePublicItemListItems(COLORS_LIST_ID);
```

## Data Structure

### ItemList
```typescript
interface ItemList {
  id: number;
  title: string;
  description?: string;
  is_active: boolean;
  is_public: boolean;
  custom_fields_schema?: any[];
  created_at: string;
  updated_at: string;
}
```

### ListItem
```typescript
interface ListItem {
  id: number;
  item_list: number;
  label: string;
  custom_id?: string;
  parent?: number; // For hierarchical items
  custom_data?: Record<string, any>;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}
```

## Security

- ✅ Public endpoints do not require authentication
- ✅ Only lists explicitly marked as `is_public=true` are accessible
- ✅ Only active lists and items are returned
- ✅ Clients cannot modify lists or items through these endpoints

## Best Practices

1. **Cache Lists:** Use React Query's built-in caching for better performance
2. **Handle Loading States:** Always show loading spinners while fetching
3. **Error Handling:** Wrap API calls in try-catch blocks
4. **Hierarchical Items:** If items have parent relationships, use recursive rendering
5. **Custom Fields:** Check `custom_fields_schema` to know what additional data is available

## Example: Complete Product Form with Public Lists

```typescript
"use client";

import { useState } from "react";
import { PublicItemListSelector } from "@/components/ecommerce/PublicItemListSelector";
import type { ListItem } from "@/api/generated";

export function ProductForm() {
  const [category, setCategory] = useState<ListItem | null>(null);
  const [brand, setBrand] = useState<ListItem | null>(null);

  const handleSubmit = () => {
    const productData = {
      name: "Product Name",
      category_id: category?.id,
      brand_id: brand?.id,
      // ... other fields
    };

    // Submit product data
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Category Selection */}
      <PublicItemListSelector
        listLabel="Product Category"
        itemLabel="Subcategory"
        onItemChange={setCategory}
      />

      {/* Brand Selection */}
      <PublicItemListSelector
        listLabel="Brand"
        onItemChange={setBrand}
      />

      <button type="submit">Create Product</button>
    </form>
  );
}
```

## Troubleshooting

### Lists not appearing?
- Verify `is_public=true` in backend
- Verify `is_active=true` in backend
- Check browser console for API errors

### Items not loading?
- Verify list ID is correct
- Check that items exist in the list
- Ensure items have `is_active=true`

### Authentication errors?
- Public endpoints should NOT require authentication
- Check axios interceptor isn't adding auth headers unnecessarily
