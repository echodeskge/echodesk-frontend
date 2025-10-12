"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, ArrowLeft } from "lucide-react";
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
import { toast } from "sonner";
import {
  itemListsRetrieve,
  listItemsCreate,
  listItemsUpdate,
  listItemsDestroy,
  listItemsChildrenRetrieve,
} from "@/api/generated/api";
import type {
  ItemList,
  ListItem,
  PatchedListItem,
} from "@/api/generated/interfaces";

interface TreeItemProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onAddChild: (parent: any) => void;
  level?: number;
}

function TreeItem({ item, onEdit, onDelete, onAddChild, level = 0 }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const hasChildren = item.children && (Array.isArray(item.children) ? item.children.length > 0 : item.children !== "");

  const loadChildren = async () => {
    if (!hasChildren || children.length > 0) return;

    setLoading(true);
    try {
      const response = await listItemsChildrenRetrieve(item.id);
      setChildren(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to load children", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    if (!isExpanded && children.length === 0) {
      loadChildren();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded-md group"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              onClick={toggleExpand}
              className="p-0.5 hover:bg-accent-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.label}</span>
              {item.custom_id && (
                <Badge variant="outline" className="text-xs">
                  {item.custom_id}
                </Badge>
              )}
              {!item.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            {item.full_path && (
              <div className="text-xs text-muted-foreground">{item.full_path}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(item)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {isExpanded && loading && (
        <div className="py-2 px-3 text-sm text-muted-foreground" style={{ paddingLeft: `${(level + 1) * 1.5 + 0.75}rem` }}>
          Loading...
        </div>
      )}
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
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
    position: 0,
    is_active: true,
  });

  useEffect(() => {
    if (listId) {
      loadItemList();
    }
  }, [listId]);

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
      position: 0,
      is_active: true,
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
      position: 0,
      is_active: true,
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
      position: item.position || 0,
      is_active: item.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        const patchData = {
          ...editingItem,
          label: formData.label,
          custom_id: formData.custom_id,
          parent: formData.parent ?? undefined,
          position: formData.position,
          is_active: formData.is_active,
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
    <div className="container mx-auto py-6">
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
            Add Root Item
          </Button>
        </CardHeader>
        <CardContent>
          {rootItems.length === 0 ? (
            <p className="text-muted-foreground">
              No items found. Add a root item to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {rootItems.map((item: any) => (
                <TreeItem
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? "Edit Item"
                : parentItem
                ? `Add Child Item to "${parentItem.label}"`
                : "Add Root Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details"
                : parentItem
                ? "Add a child item under the selected parent"
                : "Add a new root-level item to this list"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Label</Label>
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
