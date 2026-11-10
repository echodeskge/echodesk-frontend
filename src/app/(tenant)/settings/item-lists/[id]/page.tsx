"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { Edit, Trash2, ArrowLeft, List, CornerDownRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn, getApiErrorMessage } from "@/lib/utils";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { EmptyBlock, LoadingBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsPage, ListActionButton, ActionButton, BadgeCell } from "@/components/redesign/settings";
import { useSettingsSubCrumb } from "../../_lib/settings-crumb";
import { useMyAccess } from "@/hooks/useMyAccess";
import {
  itemListsRetrieve,
  listItemsCreate,
  listItemsUpdate,
  listItemsDestroy,
} from "@/api/generated/api";
import type {
  ItemList,
  ListItem,
  PatchedListItemRequest,
} from "@/api/generated/interfaces";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false }
);
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";

interface CustomField {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "boolean" | "gallery" | "wysiwyg";
  required: boolean;
}

export default function ItemListDetailPage() {
  const t = useTranslations("settings.itemListsPage.detailPage");
  const tCommon = useTranslations("common");
  // Writes need staff or manage_settings (the API refuses them otherwise); others get a read-only list.
  const { canManageSettings } = useMyAccess();
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
      toast.error(getApiErrorMessage(error, t("failedToLoad")));
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
        toast.error(t("fieldRequired", { field: field.label }));
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
        toast.success(t("itemUpdated"));
      } else {
        const newItem = {
          ...formData,
          item_list: listId,
        };
        await listItemsCreate(newItem as any);
        toast.success(t("itemCreated"));
      }
      setDialogOpen(false);
      loadItemList();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("failedToSaveItem")));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("areYouSureDeleteItem"))) return;

    try {
      await listItemsDestroy(id);
      toast.success(t("itemDeleted"));
      loadItemList();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("failedToDeleteItem")));
    }
  };

  // "Settings / Item lists / <list>" in the app header.
  useSettingsSubCrumb(itemList?.title);

  if (loading) {
    return (
      <section className="w-full p-4 sm:p-6">
        <LoadingBlock label={tCommon("loading")} testId="item-list-loading" />
      </section>
    );
  }

  if (!itemList) {
    return (
      <section className="w-full p-4 sm:p-6">
        <div className="max-w-[1040px] rounded-[10px] border bg-card">
          <EmptyBlock
            icon={List}
            title={t("itemListNotFound")}
            action={
              <ActionButton icon={ArrowLeft} onClick={() => router.back()}>
                {t("back")}
              </ActionButton>
            }
          />
        </div>
      </section>
    );
  }

  const rootItems = Array.isArray(itemList.root_items)
    ? itemList.root_items
    : itemList.items?.filter((item: any) => !item.parent) || [];
  const fieldsSchema = (itemList.custom_fields_schema as CustomField[]) || [];
  // Root items with their (active) children under them, indented by depth.
  const rows: { item: any; depth: number }[] = [];
  const walk = (items: any[], depth: number) => {
    for (const item of items) {
      rows.push({ item, depth });
      if (Array.isArray(item.children) && item.children.length > 0) walk(item.children, depth + 1);
    }
  };
  walk(rootItems, 0);

  const renderFieldValue = (item: any, field: CustomField) => {
    const value = item.custom_data?.[field.name];
    if (value === undefined || value === null || value === "") {
      return <span className="text-muted-foreground">-</span>;
    }
    if (field.type === "boolean") {
      return <BadgeCell tone={value ? "success" : "neutral"}>{value ? t("yes") : tCommon("no")}</BadgeCell>;
    }
    if (field.type === "gallery") {
      const urls = value.split(",").filter((url: string) => url.trim());
      return (
        <span className="flex gap-1">
          {urls.slice(0, 3).map((url: string, idx: number) => (
            <span key={idx} className="h-8 w-8 shrink-0 overflow-hidden rounded-md border">
              <img
                src={url.trim()}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </span>
          ))}
          {urls.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-[11px]">
              +{urls.length - 3}
            </span>
          )}
        </span>
      );
    }
    if (field.type === "wysiwyg") {
      return (
        <span className="block max-w-xs">
          <span
            className="prose prose-sm line-clamp-2 block text-[13px] dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
          />
        </span>
      );
    }
    return <span className="truncate">{value}</span>;
  };

  const columns: Column<{ item: any; depth: number }>[] = [
    {
      id: "label",
      header: t("label"),
      width: "minmax(0,1.4fr)",
      mobile: "title",
      cell: ({ item, depth }) =>
        depth > 0 ? (
          <span className="flex min-w-0 items-center gap-1.5" style={{ paddingInlineStart: (depth - 1) * 18 }}>
            <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{item.label}</span>
          </span>
        ) : (
          <span className="truncate font-medium">{item.label}</span>
        ),
    },
    {
      id: "customId",
      header: t("customId"),
      width: "minmax(0,0.7fr)",
      mobile: "end",
      cell: ({ item }) =>
        item.custom_id ? (
          <span className="inline-flex h-5 max-w-full items-center truncate rounded border px-1.5 font-mono text-[11px]">
            {item.custom_id}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    ...fieldsSchema.map(
      (field): Column<{ item: any; depth: number }> => ({
        id: `field-${field.name}`,
        header: field.label,
        width: "minmax(0,1fr)",
        cell: ({ item }) => (
          <span className="flex min-w-0 items-center gap-1">
            <span className="text-xs text-muted-foreground @3xl:hidden">{field.label}:</span>
            {renderFieldValue(item, field)}
          </span>
        ),
      })
    ),
    {
      id: "status",
      header: t("status"),
      width: "96px",
      cell: ({ item }) =>
        item.is_active ? (
          <BadgeCell tone="success" dot>
            {t("active")}
          </BadgeCell>
        ) : (
          <BadgeCell tone="neutral" dot>
            {t("inactive")}
          </BadgeCell>
        ),
    },
  ];
  if (canManageSettings) {
    columns.push({
      id: "actions",
      header: "",
      width: "72px",
      align: "end",
      mobile: "actions",
      cell: ({ item }) => (
        <span className="flex items-center justify-end gap-1">
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => handleEdit(item)}
            aria-label={tCommon("edit")}
            title={tCommon("edit")}
          >
            <Edit className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
            onClick={() => handleDelete(item.id)}
            aria-label={tCommon("delete")}
            title={tCommon("delete")}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ),
    });
  }

  return (
    <SettingsPage
      icon={List}
      title={itemList.title}
      description={itemList.description || undefined}
      width="list"
      gap={16}
      testId="item-list-detail-page"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={ArrowLeft} onClick={() => router.back()} className="h-8">
            {t("back")}
          </ActionButton>
          {canManageSettings && (
            <ListActionButton action={{ label: t("addItem"), onClick: handleCreate, testId: "item-list-add-item" }} />
          )}
        </div>
      }
    >
      <DataTable
        variant="card"
        density="comfortable"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.item.id}
        onRowClick={canManageSettings ? (row) => handleEdit(row.item) : undefined}
        renderError={() => null}
        empty={<EmptyBlock icon={List} title={t("noItemsFound")} />}
        ariaLabel={itemList.title}
        idPrefix="item-list-items"
      />
      {rows.length > 0 && (
        <span className="text-xs tabular-nums text-muted-foreground" data-testid="item-list-items-count">
          {canManageSettings
            ? `${t("count", { count: rows.length })} · ${t("clickToEdit")}`
            : t("count", { count: rows.length })}
        </span>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t("editItem") : t("addItem")}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? t("updateItemDetails")
                : t("addNewItemDetails")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">{t("labelRequired")}</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder={t("labelPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="custom_id">{t("customIdOptional")}</Label>
              <Input
                id="custom_id"
                value={formData.custom_id}
                onChange={(e) =>
                  setFormData({ ...formData, custom_id: e.target.value })
                }
                placeholder={t("customIdPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="position">{t("position")}</Label>
              <Input
                id="position"
                type="number"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: parseInt(e.target.value) || 0 })
                }
                placeholder={t("positionPlaceholder")}
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
              <Label htmlFor="is_active">{t("active")}</Label>
            </div>

            {/* Parent List Item Selector */}
            {itemList?.parent_list && parentListItems.length > 0 && (
              <div>
                <Label htmlFor="parent_list_item">{t("parentItemOptional")}</Label>
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
                    <SelectValue placeholder={t("selectParentItem")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("none")}</SelectItem>
                    {parentListItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.label}
                        {item.custom_id && ` (${item.custom_id})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("linkToParent")}
                </p>
              </div>
            )}

            {/* Custom Fields */}
            {itemList?.custom_fields_schema &&
              Array.isArray(itemList.custom_fields_schema) &&
              itemList.custom_fields_schema.length > 0 && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label className="text-base font-semibold">{t("customFields")}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("fillCustomFields")}
                    </p>
                  </div>
                  {(itemList.custom_fields_schema as CustomField[]).map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={`custom_${field.name}`}>
                        {field.label} {field.required && <span className="text-destructive">{t("requiredField")}</span>}
                      </Label>
                      {field.type === "string" && (
                        <Input
                          id={`custom_${field.name}`}
                          value={formData.custom_data[field.name] || ""}
                          onChange={(e) =>
                            updateCustomFieldValue(field.name, e.target.value)
                          }
                          placeholder={t("enterField", { field: field.label.toLowerCase() })}
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
                          placeholder={t("enterField", { field: field.label.toLowerCase() })}
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
                          placeholder={t("enterField", { field: field.label.toLowerCase() })}
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
                            {t("yes")}
                          </Label>
                        </div>
                      )}
                      {field.type === "gallery" && (
                        <ImageGalleryPicker
                          value={formData.custom_data[field.name] || ""}
                          onChange={(value) =>
                            updateCustomFieldValue(field.name, value)
                          }
                        />
                      )}
                      {field.type === "wysiwyg" && (
                        <RichTextEditor
                          content={formData.custom_data[field.name] || ""}
                          onChange={(content) =>
                            updateCustomFieldValue(field.name, content)
                          }
                          placeholder={t("enterField", { field: field.label.toLowerCase() })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.label}>
              {editingItem ? tCommon("edit") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}
