"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, List, X } from "lucide-react";
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
import type { Column } from "@/components/redesign/data-table";
import { EmptyBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsListPage, AvatarCell, BadgeCell } from "@/components/redesign/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn, getApiErrorMessage } from "@/lib/utils";
import { useMyAccess } from "@/hooks/useMyAccess";
import { useTranslations } from "next-intl";
import {
  itemListsList,
  itemListsCreate,
  itemListsUpdate,
  itemListsDestroy,
} from "@/api/generated/api";
import type { ItemList, PatchedItemListRequest } from "@/api/generated/interfaces";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CustomField {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "boolean" | "gallery" | "wysiwyg";
  required: boolean;
}

// Empty badge cells take no room on the two-line phone rows, and the first
// visible cell after them gets no leading "·".
const EMPTY_HIDDEN = "@max-3xl:empty:hidden";
const AFTER_EMPTY = "[:first-child:empty+&]:before:content-none";

export default function ItemListsPage() {
  const t = useTranslations('settings.itemListsPage');
  const router = useRouter();
  // Writes need staff or manage_settings; others get read-only lists.
  const { canManageSettings } = useMyAccess();
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
      is_public: list.is_public ?? false,
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
      toast.error(getApiErrorMessage(error, t('error.save')));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await itemListsDestroy(id);
      toast.success(t('success.deleted'));
      loadItemLists();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.delete')));
    }
  };

  const fieldsOf = (list: any): CustomField[] =>
    list.custom_fields_schema && Array.isArray(list.custom_fields_schema) ? list.custom_fields_schema : [];

  const columns: Column<any>[] = [
    {
      id: "list",
      header: t("columns.list"),
      width: "minmax(0,1.5fr)",
      mobile: "title",
      cell: (list) => <AvatarCell name={list.title} sub={list.description || undefined} shape="square" icon={List} />,
    },
    {
      id: "status",
      header: t("columns.status"),
      width: "minmax(0,0.8fr)",
      className: EMPTY_HIDDEN,
      cell: (list) =>
        !list.is_active || list.is_public ? (
          <span className="flex min-w-0 flex-wrap gap-1">
            {!list.is_active && <BadgeCell tone="neutral">{t("inactive")}</BadgeCell>}
            {list.is_public && <BadgeCell tone="success">{t("public")}</BadgeCell>}
          </span>
        ) : null,
    },
    {
      id: "items",
      header: t("columns.items"),
      width: "72px",
      align: "end",
      className: AFTER_EMPTY,
      cell: (list) => (
        <span className="tabular-nums">
          {list.items_count} <span className="@3xl:hidden">{t("items")}</span>
        </span>
      ),
    },
    {
      id: "fields",
      header: t("columns.fields"),
      width: "minmax(0,1.4fr)",
      className: EMPTY_HIDDEN,
      cell: (list) => {
        const fields = fieldsOf(list);
        return fields.length > 0 ? (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {fields.length} {t("customFields")}
            </span>
            <span className="flex min-w-0 flex-wrap gap-1">
              {fields.map((field: CustomField, idx: number) => (
                <BadgeCell key={idx} tone="neutral">
                  {field.label} ({field.type})
                </BadgeCell>
              ))}
            </span>
          </span>
        ) : null;
      },
    },
    {
      id: "created",
      header: t("columns.created"),
      width: "96px",
      muted: true,
      cell: (list) => (
        <span>
          <span className="@3xl:hidden">{t("created")}: </span>
          {new Date(list.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: canManageSettings ? "224px" : "168px",
      align: "end",
      mobile: "actions",
      cell: (list) => (
        <span className="flex items-center justify-end gap-1">
          <Link href={`/settings/item-lists/${list.id}`} className={rdButton.outlineSm}>
            <List className="h-3.5 w-3.5" aria-hidden />
            {t("manageItems")}
          </Link>
          {canManageSettings && (
            <>
              <button
                type="button"
                className={rdButton.ghostIconSm}
                onClick={() => handleEdit(list)}
                aria-label={tCommon("edit")}
                title={tCommon("edit")}
              >
                <Edit className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                onClick={() => handleDelete(list.id)}
                aria-label={tCommon("delete")}
                title={tCommon("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <SettingsListPage
      icon={List}
      title={t("title")}
      description={t("pageDescription")}
      newAction={canManageSettings ? { label: t("createList"), onClick: handleCreate, testId: "item-lists-new" } : null}
      columns={columns}
      rows={loading ? undefined : itemLists}
      rowKey={(list) => list.id}
      // A row opens the list's items, like its "Manage items" link.
      onRowClick={(list) => router.push(`/settings/item-lists/${list.id}`)}
      loading={loading}
      renderError={() => null}
      empty={<EmptyBlock icon={List} title={t("noListsFound")} />}
      countLabel={`${t("count", { count: itemLists.length })} · ${t("clickToOpen")}`}
      ariaLabel={t("title")}
      idPrefix="item-lists"
      testId="item-lists-page"
    >
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
              <Label htmlFor="is_public">{t('publicLabel')}</Label>
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
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
    </SettingsListPage>
  );
}
