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
import { useTranslations } from "next-intl";
import {
  itemListsList,
  itemListsCreate,
  itemListsUpdate,
  itemListsDestroy,
} from "@/api/generated/api";
import type { ItemList, PatchedItemListRequest } from "@/api/generated/interfaces";
import Link from "next/link";

interface CustomField {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "boolean" | "gallery" | "wysiwyg";
  required: boolean;
}

export default function ItemListsPage() {
  const t = useTranslations('settings.itemListsPage');
  const tCommon = useTranslations('common');
  const [itemLists, setItemLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ItemList | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
    is_public: false,
    parent_list: null as number | null,
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
      toast.error(t('error.load'));
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
      is_public: false,
      parent_list: null,
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
      is_public: (list as any).is_public ?? false,
      parent_list: list.parent_list || null,
      custom_fields_schema: (list.custom_fields_schema as CustomField[]) || [],
    });
    setDialogOpen(true);
  };

  const addCustomField = () => {
    if (!newField.name || !newField.label) {
      toast.error(t('error.fieldNameRequired'));
      return;
    }

    // Check for duplicate field names
    if (formData.custom_fields_schema.some((f) => f.name === newField.name)) {
      toast.error(t('error.fieldNameUnique'));
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
          is_public: formData.is_public,
          parent_list: formData.parent_list ?? undefined,
          custom_fields_schema: formData.custom_fields_schema,
        };
        await itemListsUpdate(editingList.id, patchData as any);
        toast.success(t('success.updated'));
      } else {
        await itemListsCreate(formData as any);
        toast.success(t('success.created'));
      }
      setDialogOpen(false);
      loadItemLists();
    } catch (error) {
      toast.error(t('error.save'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await itemListsDestroy(id);
      toast.success(t('success.deleted'));
      loadItemLists();
    } catch (error) {
      toast.error(t('error.delete'));
    }
  };

  return (
    <div className="w-full py-6 px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('title')}</CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createList')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t('loading')}</p>
          ) : itemLists.length === 0 ? (
            <p className="text-muted-foreground">
              {t('noListsFound')}
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
                        <Badge variant="secondary">{t('inactive')}</Badge>
                      )}
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{list.items_count} {t('items')}</span>
                      {list.custom_fields_schema &&
                        Array.isArray(list.custom_fields_schema) &&
                        list.custom_fields_schema.length > 0 && (
                          <span>
                            {list.custom_fields_schema.length} {t('customFields')}
                          </span>
                        )}
                      <span>
                        {t('created')}: {new Date(list.created_at).toLocaleDateString()}
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
                        {t('manageItems')}
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
              {editingList ? t('editDialogTitle') : t('createDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingList
                ? t('editDialogDescription')
                : t('createDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
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
            <div>
              <Label htmlFor="parent_list">{t('parentListLabel')}</Label>
              <Select
                value={formData.parent_list?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parent_list: value === "none" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger id="parent_list">
                  <SelectValue placeholder={t('parentListPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('parentListNone')}</SelectItem>
                  {itemLists
                    .filter((list) => list.id !== editingList?.id)
                    .map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('parentListHint')}
              </p>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) =>
                  setFormData({ ...formData, is_public: e.target.checked })
                }
              />
              <Label htmlFor="is_public">Public (visible to ecommerce clients)</Label>
            </div>

            {/* Custom Fields Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">{t('customFieldsSection.title')}</Label>
                <Badge variant="outline">
                  {formData.custom_fields_schema.length} {t('customFieldsSection.fieldsCount')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('customFieldsSection.description')}
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
                            <Badge variant="outline">{t('customFieldsSection.required')}</Badge>
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
                <p className="text-sm font-medium">{t('customFieldsSection.addNewField')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="field_name" className="text-xs">
                      {t('customFieldsSection.fieldNameLabel')}
                    </Label>
                    <Input
                      id="field_name"
                      value={newField.name}
                      onChange={(e) =>
                        setNewField({ ...newField, name: e.target.value })
                      }
                      placeholder={t('customFieldsSection.fieldNamePlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field_label" className="text-xs">
                      {t('customFieldsSection.fieldLabelLabel')}
                    </Label>
                    <Input
                      id="field_label"
                      value={newField.label}
                      onChange={(e) =>
                        setNewField({ ...newField, label: e.target.value })
                      }
                      placeholder={t('customFieldsSection.fieldLabelPlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field_type" className="text-xs">
                      {t('customFieldsSection.fieldTypeLabel')}
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
                        <SelectItem value="string">{t('customFieldsSection.types.string')}</SelectItem>
                        <SelectItem value="text">{t('customFieldsSection.types.text')}</SelectItem>
                        <SelectItem value="number">{t('customFieldsSection.types.number')}</SelectItem>
                        <SelectItem value="date">{t('customFieldsSection.types.date')}</SelectItem>
                        <SelectItem value="boolean">{t('customFieldsSection.types.boolean')}</SelectItem>
                        <SelectItem value="gallery">{t('customFieldsSection.types.gallery')}</SelectItem>
                        <SelectItem value="wysiwyg">{t('customFieldsSection.types.wysiwyg')}</SelectItem>
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
                        {t('customFieldsSection.required')}
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
                  {t('customFieldsSection.addField')}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.title}>
              {editingList ? t('update') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
