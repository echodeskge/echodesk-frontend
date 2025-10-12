"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  itemListsRetrieve,
  listItemsCreate,
  listItemsUpdate,
  listItemsDestroy,
} from "@/api/generated/api";
import type {
  ItemList,
  ListItem,
  PatchedListItem,
} from "@/api/generated/interfaces";

interface CustomField {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "boolean";
  required: boolean;
}

export default function ItemListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = parseInt(params.id as string);
  const [itemList, setItemList] = useState<ItemList | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [parentItem, setParentItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    custom_id: "",
    parent: null as number | null,
    parent_list_item: null as number | null,
    position: 0,
    is_active: true,
    custom_data: {} as Record<string, any>,
  });

  const [parentListItems, setParentListItems] = useState<any[]>([]);

  useEffect(() => {
    if (listId) {
      loadItemList();
    }
  }, [listId]);

  // Load parent list items when itemList has a parent_list
  useEffect(() => {
    const fetchParentListItems = async () => {
      if (itemList?.parent_list) {
        try {
          const parentList = await itemListsRetrieve(itemList.parent_list);
          setParentListItems(parentList.items || []);
        } catch (error) {
          console.error("Failed to load parent list items", error);
        }
      } else {
        setParentListItems([]);
      }
    };

    if (itemList) {
      fetchParentListItems();
    }
  }, [itemList]);

  const loadItemList = async () => {
    try {
      setLoading(true);
      const response = await itemListsRetrieve(listId);
      setItemList(response);
    } catch (error) {
      toast.error("Failed to load item list");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setParentItem(null);
    setFormData({
      label: "",
      custom_id: "",
      parent: null,
      parent_list_item: null,
      position: 0,
      is_active: true,
      custom_data: {},
    });
    setDialogOpen(true);
  };

  const handleAddChild = (parent: any) => {
    setEditingItem(null);
    setParentItem(parent);
    setFormData({
      label: "",
      custom_id: "",
      parent: parent.id,
      parent_list_item: null,
      position: 0,
      is_active: true,
      custom_data: {},
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setParentItem(null);
    setFormData({
      label: item.label,
      custom_id: item.custom_id || "",
      parent: item.parent || null,
      parent_list_item: item.parent_list_item || null,
      position: item.position || 0,
      is_active: item.is_active ?? true,
      custom_data: item.custom_data || {},
    });
    setDialogOpen(true);
  };

  const updateCustomFieldValue = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      custom_data: {
        ...formData.custom_data,
        [fieldName]: value,
      },
    });
  };

  const handleSave = async () => {
    // Validate required custom fields
    const customFieldsSchema = (itemList?.custom_fields_schema as CustomField[]) || [];
    for (const field of customFieldsSchema) {
      if (field.required && !formData.custom_data[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    try {
      if (editingItem) {
        const patchData = {
          ...editingItem,
          label: formData.label,
          custom_id: formData.custom_id,
          parent: formData.parent ?? undefined,
          parent_list_item: formData.parent_list_item ?? undefined,
          position: formData.position,
          is_active: formData.is_active,
          custom_data: formData.custom_data,
        };
        await listItemsUpdate(editingItem.id, patchData as any);
        toast.success("Item updated successfully");
      } else {
        const newItem = {
          ...formData,
          item_list: listId,
        };
        await listItemsCreate(newItem as any);
        toast.success("Item created successfully");
      }
      setDialogOpen(false);
      loadItemList();
    } catch (error) {
      toast.error("Failed to save item");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item? This will also delete all child items.")) return;

    try {
      await listItemsDestroy(id);
      toast.success("Item deleted successfully");
      loadItemList();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!itemList) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p>Item list not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rootItems = Array.isArray(itemList.root_items)
    ? itemList.root_items
    : itemList.items?.filter((item: any) => !item.parent) || [];

  return (
    <div className="w-full py-6 px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>{itemList.title}</CardTitle>
              {itemList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {itemList.description}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {rootItems.length === 0 ? (
            <p className="text-muted-foreground">
              No items found. Add a root item to get started.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Custom ID</TableHead>
                    {((itemList.custom_fields_schema as CustomField[]) || []).map(
                      (field) => (
                        <TableHead key={field.name}>{field.label}</TableHead>
                      )
                    )}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell>
                        {item.custom_id ? (
                          <Badge variant="outline">{item.custom_id}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {((itemList.custom_fields_schema as CustomField[]) || []).map(
                        (field) => {
                          const value = item.custom_data?.[field.name];
                          return (
                            <TableCell key={field.name}>
                              {value !== undefined &&
                              value !== null &&
                              value !== "" ? (
                                field.type === "boolean" ? (
                                  <Badge variant={value ? "default" : "secondary"}>
                                    {value ? "Yes" : "No"}
                                  </Badge>
                                ) : (
                                  <span>{value}</span>
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        }
                      )}
                      <TableCell>
                        {item.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details and custom field values"
                : "Add a new item with custom field values to this list"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., Electronics"
              />
            </div>
            <div>
              <Label htmlFor="custom_id">Custom ID (Optional)</Label>
              <Input
                id="custom_id"
                value={formData.custom_id}
                onChange={(e) =>
                  setFormData({ ...formData, custom_id: e.target.value })
                }
                placeholder="e.g., CAT-001"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="number"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            {/* Parent List Item Selector */}
            {itemList?.parent_list && parentListItems.length > 0 && (
              <div>
                <Label htmlFor="parent_list_item">Parent Item (Optional)</Label>
                <Select
                  value={formData.parent_list_item?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parent_list_item: value === "none" ? null : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger id="parent_list_item">
                    <SelectValue placeholder="Select parent item from parent list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {parentListItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.label}
                        {item.custom_id && ` (${item.custom_id})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Link this item to an item from the parent list
                </p>
              </div>
            )}

            {/* Custom Fields */}
            {itemList?.custom_fields_schema &&
              Array.isArray(itemList.custom_fields_schema) &&
              itemList.custom_fields_schema.length > 0 && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Custom Fields</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fill in the custom field values for this item
                    </p>
                  </div>
                  {(itemList.custom_fields_schema as CustomField[]).map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={`custom_${field.name}`}>
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.type === "string" && (
                        <Input
                          id={`custom_${field.name}`}
                          value={formData.custom_data[field.name] || ""}
                          onChange={(e) =>
                            updateCustomFieldValue(field.name, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                        />
                      )}
                      {field.type === "text" && (
                        <Textarea
                          id={`custom_${field.name}`}
                          value={formData.custom_data[field.name] || ""}
                          onChange={(e) =>
                            updateCustomFieldValue(field.name, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                          className="resize-none min-h-[80px]"
                        />
                      )}
                      {field.type === "number" && (
                        <Input
                          id={`custom_${field.name}`}
                          type="number"
                          value={formData.custom_data[field.name] || ""}
                          onChange={(e) =>
                            updateCustomFieldValue(
                              field.name,
                              e.target.value ? parseFloat(e.target.value) : ""
                            )
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          required={field.required}
                        />
                      )}
                      {field.type === "date" && (
                        <Input
                          id={`custom_${field.name}`}
                          type="date"
                          value={formData.custom_data[field.name] || ""}
                          onChange={(e) =>
                            updateCustomFieldValue(field.name, e.target.value)
                          }
                          required={field.required}
                        />
                      )}
                      {field.type === "boolean" && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            id={`custom_${field.name}`}
                            checked={formData.custom_data[field.name] || false}
                            onChange={(e) =>
                              updateCustomFieldValue(field.name, e.target.checked)
                            }
                          />
                          <Label
                            htmlFor={`custom_${field.name}`}
                            className="font-normal text-sm"
                          >
                            Yes
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.label}>
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
