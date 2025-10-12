"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star, StarOff } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  ticketFormsList,
  ticketFormsCreate,
  ticketFormsUpdate,
  ticketFormsDestroy,
  ticketFormsSetDefaultCreate,
  itemListsList,
} from "@/api/generated/api";
import type {
  TicketForm,
  PatchedTicketForm,
  ItemListMinimal,
} from "@/api/generated/interfaces";

export default function TicketFormsPage() {
  const [forms, setForms] = useState<TicketForm[]>([]);
  const [itemLists, setItemLists] = useState<ItemListMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<TicketForm | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    item_list_ids: [] as number[],
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [formsResponse, listsResponse] = await Promise.all([
        ticketFormsList(),
        itemListsList(),
      ]);
      setForms(formsResponse.results || []);
      setItemLists(listsResponse.results || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load ticket forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingForm(null);
    setFormData({
      title: "",
      description: "",
      item_list_ids: [],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (form: TicketForm) => {
    setEditingForm(form);
    setFormData({
      title: form.title,
      description: form.description || "",
      item_list_ids: form.item_lists?.map((list) => list.id) || [],
      is_active: form.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingForm) {
        const patchData: PatchedTicketForm = {
          title: formData.title,
          description: formData.description,
          item_list_ids: formData.item_list_ids,
          is_active: formData.is_active,
        };
        await ticketFormsUpdate(editingForm.id, patchData);
        toast({
          title: "Success",
          description: "Ticket form updated successfully",
        });
      } else {
        await ticketFormsCreate(formData as any);
        toast({
          title: "Success",
          description: "Ticket form created successfully",
        });
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save ticket form",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ticket form?")) return;

    try {
      await ticketFormsDestroy(id);
      toast({
        title: "Success",
        description: "Ticket form deleted successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket form",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await ticketFormsSetDefaultCreate(id);
      toast({
        title: "Success",
        description: "Default form updated successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default form",
        variant: "destructive",
      });
    }
  };

  const toggleItemList = (listId: number) => {
    setFormData((prev) => ({
      ...prev,
      item_list_ids: prev.item_list_ids.includes(listId)
        ? prev.item_list_ids.filter((id) => id !== listId)
        : [...prev.item_list_ids, listId],
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ticket Forms</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : forms.length === 0 ? (
            <p className="text-muted-foreground">
              No ticket forms found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{form.title}</h3>
                      {form.is_default && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {!form.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {form.item_lists && form.item_lists.length > 0 && (
                        <span>{form.item_lists.length} attached lists</span>
                      )}
                      <span>{form.submissions_count} submissions</span>
                      <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                    {form.item_lists && form.item_lists.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.item_lists.map((list) => (
                          <Badge key={list.id} variant="outline">
                            {list.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!form.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(form.id)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(form)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!form.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(form.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? "Edit Ticket Form" : "Create Ticket Form"}
            </DialogTitle>
            <DialogDescription>
              {editingForm
                ? "Update the ticket form details"
                : "Create a new ticket form with attached item lists"}
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
                placeholder="e.g., Product Order Form"
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
                placeholder="Optional description of when to use this form"
              />
            </div>
            <div>
              <Label>Attached Item Lists</Label>
              <div className="border rounded-lg p-3 mt-2 space-y-2 max-h-60 overflow-y-auto">
                {itemLists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No item lists available. Create one first.
                  </p>
                ) : (
                  itemLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center gap-2 p-2 hover:bg-accent rounded"
                    >
                      <input
                        type="checkbox"
                        id={`list-${list.id}`}
                        checked={formData.item_list_ids.includes(list.id)}
                        onChange={() => toggleItemList(list.id)}
                      />
                      <label
                        htmlFor={`list-${list.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{list.title}</div>
                        {list.description && (
                          <div className="text-xs text-muted-foreground">
                            {list.description}
                          </div>
                        )}
                      </label>
                      <Badge variant="outline">{list.items_count}</Badge>
                    </div>
                  ))
                )}
              </div>
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
              {editingForm ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
