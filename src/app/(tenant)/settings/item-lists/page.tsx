"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, List } from "lucide-react";
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
import { toast } from "sonner";
import {
  itemListsList,
  itemListsCreate,
  itemListsUpdate,
  itemListsDestroy,
} from "@/api/generated/api";
import type { ItemList, PatchedItemList } from "@/api/generated/interfaces";
import Link from "next/link";

export default function ItemListsPage() {
  const [itemLists, setItemLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ItemList | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
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
    setFormData({ title: "", description: "", is_active: true });
    setDialogOpen(true);
  };

  const handleEdit = (list: ItemList) => {
    setEditingList(list);
    setFormData({
      title: list.title,
      description: list.description || "",
      is_active: list.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingList) {
        const patchData = {
          ...editingList,
          title: formData.title,
          description: formData.description,
          is_active: formData.is_active,
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
                      <span>Created: {new Date(list.created_at).toLocaleDateString()}</span>
                    </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Edit Item List" : "Create Item List"}
            </DialogTitle>
            <DialogDescription>
              {editingList
                ? "Update the item list details"
                : "Create a new item list for organizing items"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
