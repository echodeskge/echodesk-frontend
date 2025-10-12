"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, List, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  itemListsList,
  itemListsCreate,
  itemListsUpdate,
  itemListsDestroy,
} from "@/api/generated/api";
import type { ItemList, PatchedItemList } from "@/api/generated/interfaces";
import Link from "next/link";

interface CustomField {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "boolean";
  required: boolean;
}

export default function ItemListsPage() {
  const [itemLists, setItemLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ItemList | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
    custom_fields_schema: [] as CustomField[],
  });

  const [newField, setNewField] = useState<CustomField>({
    name: "",
    label: "",
    type: "string",
    required: false,
  });
  useEffect(() => {
    loadItemLists();
  }, []);

  const loadItemLists = async () => {
    try {
      setLoading(true);
      const response = await itemListsList();
      setItemLists(response.results || []);
    } catch (error) {
      toast.error("Failed to load item lists");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingList(null);
    setFormData({
      title: "",
      description: "",
      is_active: true,
      custom_fields_schema: [],
    });
    setDialogOpen(true);
  };

  const handleEdit = (list: ItemList) => {
    setEditingList(list);
    setFormData({
      title: list.title,
      description: list.description || "",
      is_active: list.is_active ?? true,
      custom_fields_schema: (list.custom_fields_schema as CustomField[]) || [],
    });
    setDialogOpen(true);
  };

  const addCustomField = () => {
    if (!newField.name || !newField.label) {
      toast.error("Field name and label are required");
      return;
    }

    // Check for duplicate field names
    if (formData.custom_fields_schema.some((f) => f.name === newField.name)) {
      toast.error("Field name must be unique");
      return;
    }

    setFormData({
      ...formData,
      custom_fields_schema: [...formData.custom_fields_schema, newField],
    });
    setNewField({
      name: "",
      label: "",
      type: "string",
      required: false,
    });
  };

  const removeCustomField = (index: number) => {
    setFormData({
      ...formData,
      custom_fields_schema: formData.custom_fields_schema.filter(
        (_, i) => i !== index
      ),
    });
  };

  const handleSave = async () => {
    try {
      if (editingList) {
        const patchData = {
          ...editingList,
          title: formData.title,
          description: formData.description,
          is_active: formData.is_active,
          custom_fields_schema: formData.custom_fields_schema,
        };
        await itemListsUpdate(editingList.id, patchData as any);
        toast.success("Item list updated successfully");
      } else {
        await itemListsCreate(formData as any);
        toast.success("Item list created successfully");
      }
      setDialogOpen(false);
      loadItemLists();
    } catch (error) {
      toast.error("Failed to save item list");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item list?")) return;

    try {
      await itemListsDestroy(id);
      toast.success("Item list deleted successfully");
      loadItemLists();
    } catch (error) {
      toast.error("Failed to delete item list");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Item Lists</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create List
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : itemLists.length === 0 ? (
            <p className="text-muted-foreground">
              No item lists found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {itemLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{list.title}</h3>
                      {!list.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{list.items_count}</span>
                      {list.custom_fields_schema &&
                        Array.isArray(list.custom_fields_schema) &&
                        list.custom_fields_schema.length > 0 && (
                          <span>
                            {list.custom_fields_schema.length} custom field(s)
                          </span>
                        )}
                      <span>
                        Created: {new Date(list.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {list.custom_fields_schema &&
                      Array.isArray(list.custom_fields_schema) &&
                      list.custom_fields_schema.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {list.custom_fields_schema.map((field: CustomField, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {field.label} ({field.type})
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/settings/item-lists/${list.id}`}>
                      <Button variant="outline" size="sm">
                        <List className="h-4 w-4 mr-2" />
                        Manage Items
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(list)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(list.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Edit Item List" : "Create Item List"}
            </DialogTitle>
            <DialogDescription>
              {editingList
                ? "Update the item list details and custom fields"
                : "Create a new item list with custom fields for organizing items"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Product Categories"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
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

            {/* Custom Fields Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Custom Fields</Label>
                <Badge variant="outline">
                  {formData.custom_fields_schema.length} field(s)
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Define custom fields that items in this list should have (e.g., client name, address, ID number)
              </p>

              {/* Existing Custom Fields */}
              {formData.custom_fields_schema.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.custom_fields_schema.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="font-medium">{field.label}</span>
                          <p className="text-xs text-muted-foreground">
                            {field.name}
                          </p>
                        </div>
                        <div>
                          <Badge variant="secondary">{field.type}</Badge>
                        </div>
                        <div>
                          {field.required && (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Field Form */}
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Add New Field</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="field_name" className="text-xs">
                      Field Name (key)
                    </Label>
                    <Input
                      id="field_name"
                      value={newField.name}
                      onChange={(e) =>
                        setNewField({ ...newField, name: e.target.value })
                      }
                      placeholder="e.g., client_name"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field_label" className="text-xs">
                      Label (display)
                    </Label>
                    <Input
                      id="field_label"
                      value={newField.label}
                      onChange={(e) =>
                        setNewField({ ...newField, label: e.target.value })
                      }
                      placeholder="e.g., Client Name"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field_type" className="text-xs">
                      Type
                    </Label>
                    <Select
                      value={newField.type}
                      onValueChange={(value: any) =>
                        setNewField({ ...newField, type: value })
                      }
                    >
                      <SelectTrigger id="field_type" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String (short text)</SelectItem>
                        <SelectItem value="text">Text (long text)</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Boolean (yes/no)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="field_required"
                        checked={newField.required}
                        onChange={(e) =>
                          setNewField({
                            ...newField,
                            required: e.target.checked,
                          })
                        }
                      />
                      <Label htmlFor="field_required" className="text-xs">
                        Required
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Add Field
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title}>
              {editingList ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
