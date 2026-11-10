"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Star, X, FileText } from "lucide-react";
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
  ticketFormsList,
  ticketFormsCreate,
  ticketFormsUpdate,
  ticketFormsDestroy,
  ticketFormsSetDefaultCreate,
  itemListsList,
} from "@/api/generated/api";
import type {
  TicketForm,
  PatchedTicketFormRequest,
  ItemListMinimal,
} from "@/api/generated/interfaces";

// Empty badge cells take no room on the two-line phone rows (no stray "·").
const EMPTY_HIDDEN = "@max-3xl:empty:hidden";
// ...and the first visible cell of that line gets no leading "·" either.
const AFTER_EMPTY = "[:first-child:empty+&]:before:content-none [:first-child:empty+:empty+&]:before:content-none";

export default function TicketFormsPage() {
  const t = useTranslations('settings.ticketFormsPage');
  // Writes need staff or manage_settings; others get read-only lists.
  const { canManageSettings } = useMyAccess();
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
        await ticketFormsUpdate(editingForm.id, patchData as any);
        toast.success(t('success.updated'));
      } else {
        await ticketFormsCreate(formData as any);
        toast.success(t('success.created'));
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.save')));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await ticketFormsDestroy(id);
      toast.success(t('success.deleted'));
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.delete')));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const form = forms.find(f => f.id === id);
      if (!form) return;
      await ticketFormsSetDefaultCreate(id, form as any);
      toast.success(t('success.defaultUpdated'));
      loadData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.setDefault')));
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

  const columns: Column<any>[] = [
    {
      id: "form",
      header: t("columns.form"),
      width: "minmax(0,1.5fr)",
      mobile: "title",
      cell: (form) => (
        <AvatarCell name={form.title} sub={form.description || undefined} shape="square" icon={FileText} />
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      width: "minmax(0,1.1fr)",
      className: EMPTY_HIDDEN,
      cell: (form) => {
        const badges = [
          form.is_default && (
            <BadgeCell key="default" tone="info">
              <Star className="me-1 inline h-3 w-3 align-[-2px]" aria-hidden />
              {t("default")}
            </BadgeCell>
          ),
          !form.is_active && (
            <BadgeCell key="inactive" tone="neutral">
              {t("inactive")}
            </BadgeCell>
          ),
          form.parent_form && (
            <BadgeCell key="parent" tone="violet">
              {t("childOf", { title: form.parent_form.title })}
            </BadgeCell>
          ),
          form.child_forms && form.child_forms.length > 0 && (
            <BadgeCell key="children" tone="success">
              {t("childCount", { count: form.child_forms.length })}
            </BadgeCell>
          ),
        ].filter(Boolean);
        return badges.length ? <span className="flex min-w-0 flex-wrap gap-1">{badges}</span> : null;
      },
    },
    {
      id: "lists",
      header: t("columns.lists"),
      width: "minmax(0,1.2fr)",
      className: cn(EMPTY_HIDDEN, AFTER_EMPTY),
      cell: (form) =>
        form.item_lists && form.item_lists.length > 0 ? (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {form.item_lists.length} {t("attachedLists")}
            </span>
            <span className="flex min-w-0 flex-wrap gap-1">
              {form.item_lists.map((list: any) => (
                <BadgeCell key={list.id} tone="neutral">
                  {list.title}
                </BadgeCell>
              ))}
            </span>
          </span>
        ) : null,
    },
    {
      id: "submissions",
      header: t("columns.submissions"),
      width: "96px",
      align: "end",
      className: AFTER_EMPTY,
      cell: (form) => (
        <span className="tabular-nums">
          {form.submissions_count} <span className="@3xl:hidden">{t("submissions")}</span>
        </span>
      ),
    },
    {
      id: "created",
      header: t("columns.created"),
      width: "96px",
      muted: true,
      cell: (form) => (
        <span>
          <span className="@3xl:hidden">{t("created")}: </span>
          {new Date(form.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];
  if (canManageSettings) {
    columns.push({
      id: "actions",
      header: "",
      width: "224px",
      align: "end",
      mobile: "actions",
      cell: (form) => (
        <span className="flex items-center justify-end gap-1">
          {!form.is_default && (
            <button type="button" className={rdButton.outlineSm} onClick={() => handleSetDefault(form.id)}>
              <Star className="h-3.5 w-3.5" aria-hidden />
              {t("setDefault")}
            </button>
          )}
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => handleEdit(form)}
            aria-label={tCommon("edit")}
            title={tCommon("edit")}
          >
            <Edit className="h-3.5 w-3.5" aria-hidden />
          </button>
          {!form.is_default && (
            <button
              type="button"
              className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
              onClick={() => handleDelete(form.id)}
              aria-label={tCommon("delete")}
              title={tCommon("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </span>
      ),
    });
  }

  return (
    <SettingsListPage
      icon={FileText}
      title={t("title")}
      description={t("pageDescription")}
      newAction={
        canManageSettings
          ? { label: t("createForm"), onClick: handleCreate, testId: "ticket-forms-new" }
          : null
      }
      columns={columns}
      rows={loading ? undefined : forms}
      rowKey={(form) => form.id}
      onRowClick={canManageSettings ? (form) => handleEdit(form) : undefined}
      loading={loading}
      renderError={() => null}
      empty={<EmptyBlock icon={FileText} title={t("noFormsFound")} />}
      countLabel={
        canManageSettings
          ? `${t("count", { count: forms.length })} · ${t("clickToEdit")}`
          : t("count", { count: forms.length })
      }
      ariaLabel={t("title")}
      idPrefix="ticket-forms"
      testId="ticket-forms-page"
    >
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
              <Label htmlFor="parent_form">{t('parentFormLabel')}</Label>
              <Select
                value={formData.parent_form_id?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_form_id: value === "none" ? null : parseInt(value) })
                }
              >
                <SelectTrigger id="parent_form">
                  <SelectValue placeholder={t('parentFormPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('parentFormNone')}</SelectItem>
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
                {t('parentFormHint')}
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
                <Label>{t('customFields.title')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('customFields.add')}
                </Button>
              </div>
              <div className="border rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
                {formData.custom_fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('customFields.empty')}
                  </p>
                ) : (
                  formData.custom_fields.map((field, index) => (
                    <div
                      key={index}
                      className="border rounded p-3 space-y-2 bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">{t('customFields.name')}</Label>
                              <Input
                                value={field.name}
                                onChange={(e) =>
                                  updateCustomField(index, { name: e.target.value })
                                }
                                placeholder={t('customFields.namePlaceholder')}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">{t('customFields.label')}</Label>
                              <Input
                                value={field.label}
                                onChange={(e) =>
                                  updateCustomField(index, { label: e.target.value })
                                }
                                placeholder={t('customFields.labelPlaceholder')}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">{t('customFields.type')}</Label>
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
                                    {t('customFields.types.string')}
                                  </SelectItem>
                                  <SelectItem value="text">
                                    {t('customFields.types.text')}
                                  </SelectItem>
                                  <SelectItem value="number">{t('customFields.types.number')}</SelectItem>
                                  <SelectItem value="date">{t('customFields.types.date')}</SelectItem>
                                  <SelectItem value="signature">
                                    {t('customFields.types.signature')}
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
                                  {t('customFields.required')}
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
    </SettingsListPage>
  );
}
