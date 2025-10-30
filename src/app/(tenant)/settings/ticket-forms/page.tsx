"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star, X } from "lucide-react";
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
import { useTranslations } from "next-intl";
import {
  apiTicketFormsList,
  apiTicketFormsCreate,
  apiTicketFormsUpdate,
  apiTicketFormsDestroy,
  apiTicketFormsSetDefaultCreate,
  apiItemListsList,
} from "@/api/generated/api";
import type {
  TicketForm,
  PatchedTicketForm,
  ItemListMinimal,
} from "@/api/generated/interfaces";

export default function TicketFormsPage() {
  const t = useTranslations('settings.ticketFormsPage');
  const tCommon = useTranslations('common');
  const [forms, setForms] = useState<any[]>([]);
  const [itemLists, setItemLists] = useState<ItemListMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<TicketForm | null>(null);
  interface CustomField {
    name: string;
    label: string;
    type: "string" | "text" | "number" | "date" | "signature";
    required: boolean;
  }

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    parent_form_id: null as number | null,
    item_list_ids: [] as number[],
    custom_fields: [] as CustomField[],
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Debug: Log when formData changes
  useEffect(() => {
    console.log('formData changed:', formData);
  }, [formData]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [formsResponse, listsResponse] = await Promise.all([
        apiTicketFormsList(),
        apiItemListsList(),
      ]);
      setForms(formsResponse.results || []);
      setItemLists(listsResponse.results || []);
    } catch (error) {
      toast.error(t('error.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingForm(null);
    setFormData({
      title: "",
      description: "",
      parent_form_id: null,
      item_list_ids: [],
      custom_fields: [],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (form: TicketForm) => {
    console.log('Editing form:', form);
    console.log('Form custom_fields type:', typeof form.custom_fields, 'value:', form.custom_fields);
    console.log('Form item_lists:', form.item_lists);
    console.log('Form parent_form:', form.parent_form);

    // Ensure custom_fields is an array
    let customFields: CustomField[] = [];
    if (form.custom_fields) {
      if (Array.isArray(form.custom_fields)) {
        customFields = form.custom_fields as CustomField[];
      } else if (typeof form.custom_fields === 'object') {
        // If it's an object, try to convert it to array
        customFields = Object.values(form.custom_fields) as CustomField[];
      }
    }

    const formDataToSet = {
      title: form.title,
      description: form.description || "",
      parent_form_id: form.parent_form?.id || null,
      item_list_ids: form.item_lists?.map((list) => list.id) || [],
      custom_fields: customFields,
      is_active: form.is_active ?? true,
    };

    console.log('Setting formData to:', formDataToSet);

    // Set formData first, then editingForm, then open dialog
    // This ensures formData is updated before the dialog renders
    setFormData(formDataToSet);
    setEditingForm(form);
    // Use setTimeout to ensure state updates are applied before dialog opens
    setTimeout(() => setDialogOpen(true), 0);
  };

  const handleSave = async () => {
    try {
      if (editingForm) {
        const patchData = {
          ...editingForm,
          title: formData.title,
          description: formData.description,
          parent_form_id: formData.parent_form_id,
          item_list_ids: formData.item_list_ids,
          custom_fields: formData.custom_fields,
          is_active: formData.is_active,
        };
        await apiTicketFormsUpdate(editingForm.id, patchData as any);
        toast.success(t('success.updated'));
      } else {
        await apiTicketFormsCreate(formData as any);
        toast.success(t('success.created'));
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(t('error.save'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await apiTicketFormsDestroy(id);
      toast.success(t('success.deleted'));
      loadData();
    } catch (error) {
      toast.error(t('error.delete'));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const form = forms.find(f => f.id === id);
      if (!form) return;
      await apiTicketFormsSetDefaultCreate(id, form as any);
      toast.success(t('success.defaultUpdated'));
      loadData();
    } catch (error) {
      toast.error(t('error.setDefault'));
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

  const addCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: [
        ...prev.custom_fields,
        {
          name: "",
          label: "",
          type: "string" as const,
          required: false,
        },
      ],
    }));
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.map((f, i) =>
        i === index ? { ...f, ...field } : f
      ),
    }));
  };

  const removeCustomField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createForm')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t('loading')}</p>
          ) : forms.length === 0 ? (
            <p className="text-muted-foreground">
              {t('noFormsFound')}
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
                          {t('default')}
                        </Badge>
                      )}
                      {!form.is_active && (
                        <Badge variant="secondary">{t('inactive')}</Badge>
                      )}
                      {form.parent_form && (
                        <Badge variant="outline" className="bg-blue-50">
                          Child of: {form.parent_form.title}
                        </Badge>
                      )}
                      {form.child_forms && form.child_forms.length > 0 && (
                        <Badge variant="outline" className="bg-green-50">
                          Has {form.child_forms.length} child form(s)
                        </Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {form.item_lists && form.item_lists.length > 0 && (
                        <span>{form.item_lists.length} {t('attachedLists')}</span>
                      )}
                      <span>{form.submissions_count} {t('submissions')}</span>
                      <span>{t('created')}: {new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                    {form.item_lists && form.item_lists.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.item_lists.map((list: any) => (
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
                        {t('setDefault')}
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
        <DialogContent key={editingForm?.id || 'new'} className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm ? t('editDialogTitle') : t('createDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingForm
                ? t('editDialogDescription')
                : t('createDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">{t('titleLabel')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t('titlePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="description">{t('descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Parent Form Selector */}
            <div>
              <Label htmlFor="parent_form">Parent Form (Optional)</Label>
              <Select
                value={formData.parent_form_id?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_form_id: value === "none" ? null : parseInt(value) })
                }
              >
                <SelectTrigger id="parent_form">
                  <SelectValue placeholder="Select parent form (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Root Form)</SelectItem>
                  {forms
                    .filter((f) => f.id !== editingForm?.id) // Don't allow selecting itself
                    .map((form) => (
                      <SelectItem key={form.id} value={form.id.toString()}>
                        {form.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                If set, this form will be a child form that assigned users need to fill after the parent form is completed.
              </p>
            </div>

            <div>
              <Label>{t('attachedItemLists')}</Label>
              <div className="border rounded-lg p-3 mt-2 space-y-2 max-h-60 overflow-y-auto">
                {itemLists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('noItemListsAvailable')}
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

            {/* Custom Fields Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Custom Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
              <div className="border rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
                {formData.custom_fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No custom fields defined. Click "Add Field" to create one.
                  </p>
                ) : (
                  formData.custom_fields.map((field, index) => (
                    <div
                      key={index}
                      className="border rounded p-3 space-y-2 bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Field Name (ID)</Label>
                              <Input
                                value={field.name}
                                onChange={(e) =>
                                  updateCustomField(index, { name: e.target.value })
                                }
                                placeholder="e.g., delivery_address"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateCustomField(index, { label: e.target.value })
                                }
                                placeholder="e.g., Delivery Address"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) =>
                                  updateCustomField(index, {
                                    type: value as CustomField["type"],
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">
                                    Text (Single Line)
                                  </SelectItem>
                                  <SelectItem value="text">
                                    Text (Multi Line)
                                  </SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="signature">
                                    Signature (Image Upload)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`required-${index}`}
                                  checked={field.required}
                                  onChange={(e) =>
                                    updateCustomField(index, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4"
                                />
                                <Label
                                  htmlFor={`required-${index}`}
                                  className="text-xs"
                                >
                                  Required
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
              <Label htmlFor="is_active">{t('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.title}>
              {editingForm ? t('update') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
