"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminShippingMethodsList,
  ecommerceAdminShippingMethodsCreate,
  ecommerceAdminShippingMethodsUpdate,
  ecommerceAdminShippingMethodsDestroy,
} from "@/api/generated";
import type { ShippingMethod, ShippingMethodRequest } from "@/api/generated/interfaces";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { getApiErrorMessage } from "@/lib/utils";
import {
  ActivePill,
  EcEmptyState,
  EcPage,
  EcTable,
  EcommerceHeaderBridge,
  FormField,
  FormGrid,
  FormSection,
  FormSheet,
  FormSwitchRow,
  ecField,
  localizedText,
  rdButton,
  type EcColumn,
} from "../_components/ui";
import { MoneyInput } from "./_components/money-input";
import { ShippingPriceCell, formatEta } from "./_lib/shipping";

const EMPTY_FORM: ShippingMethodRequest = {
  name: { en: "", ka: "" },
  description: { en: "", ka: "" },
  price: "0.00",
  free_shipping_threshold: "",
  is_active: true,
  estimated_days: 1,
  position: 0,
};

type Bilingual = { en?: string; ka?: string };
const asBilingual = (value: unknown): Bilingual =>
  typeof value === "object" && value !== null ? (value as Bilingual) : {};

export default function ShippingMethodsPage() {
  const t = useTranslations("shippingMethods");
  const locale = useLocale();

  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [form, setForm] = useState<ShippingMethodRequest>({ ...EMPTY_FORM });

  const [deletingMethod, setDeletingMethod] = useState<ShippingMethod | null>(null);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const response = await ecommerceAdminShippingMethodsList();
      setMethods(response.results || []);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
      toast.error(getApiErrorMessage(error, t("fetchError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getName = (method: ShippingMethod): string => {
    if (typeof method.name === "object" && method.name !== null) {
      return localizedText(method.name as Record<string, string>, locale);
    }
    return String(method.name || "");
  };

  const getDescription = (method: ShippingMethod): string => {
    if (typeof method.description === "object" && method.description !== null) {
      return localizedText(method.description as Record<string, string>, locale);
    }
    return String(method.description || "");
  };

  const handleAdd = () => {
    setEditingMethod(null);
    setForm({ ...EMPTY_FORM });
    setSheetOpen(true);
  };

  const handleEdit = (method: ShippingMethod) => {
    setEditingMethod(method);
    setForm({
      name: method.name ?? { en: "", ka: "" },
      description: method.description ?? { en: "", ka: "" },
      price: method.price || "0.00",
      free_shipping_threshold: method.free_shipping_threshold || "",
      is_active: method.is_active ?? true,
      estimated_days: method.estimated_days ?? 1,
      position: method.position ?? 0,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingMethod) {
        await ecommerceAdminShippingMethodsUpdate(editingMethod.id, form);
        toast.success(t("updateSuccess"));
      } else {
        await ecommerceAdminShippingMethodsCreate(form);
        toast.success(t("createSuccess"));
      }
      setSheetOpen(false);
      fetchMethods();
    } catch (error) {
      toast.error(getApiErrorMessage(error, editingMethod ? t("updateError") : t("createError")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMethod) return;
    try {
      await ecommerceAdminShippingMethodsDestroy(deletingMethod.id);
      toast.success(t("deleteSuccess"));
      setDeletingMethod(null);
      fetchMethods();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("deleteError")));
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingMethod(null);
  };

  const setName = (lang: "en" | "ka", value: string) =>
    setForm({ ...form, name: { ...asBilingual(form.name), [lang]: value } });
  const setDescription = (lang: "en" | "ka", value: string) =>
    setForm({ ...form, description: { ...asBilingual(form.description), [lang]: value } });

  const columns: EcColumn<ShippingMethod>[] = [
    {
      id: "name",
      header: t("table.name"),
      width: "minmax(0,1.6fr)",
      mobile: "title",
      cell: (m) => {
        const description = getDescription(m);
        return (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{getName(m)}</span>
            {description && (
              <span className="hidden truncate text-xs text-muted-foreground @3xl:block">{description}</span>
            )}
          </span>
        );
      },
    },
    {
      id: "price",
      header: t("table.price"),
      width: "100px",
      align: "end",
      mobile: "meta",
      cell: (m) => {
        const eta = formatEta(m.estimated_days, (count) => t("daysCount", { count }));
        return (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 tabular-nums">
            <ShippingPriceCell value={m.price} freeLabel={t("free")} />
            {/* Below 768px the free-over amount and the delivery time join the price line. */}
            {m.free_shipping_threshold && (
              <span className="@3xl:hidden">
                · {t("freeOverShort")} <ShippingPriceCell value={m.free_shipping_threshold} />
              </span>
            )}
            {eta && <span className="@3xl:hidden">· {eta}</span>}
          </span>
        );
      },
    },
    {
      id: "free",
      header: t("table.freeOver"),
      width: "110px",
      align: "end",
      mobile: "hidden",
      cell: (m) =>
        m.free_shipping_threshold ? (
          <ShippingPriceCell value={m.free_shipping_threshold} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "eta",
      header: t("table.estimatedDays"),
      width: "120px",
      align: "end",
      mobile: "hidden",
      cell: (m) => {
        const eta = formatEta(m.estimated_days, (count) => t("daysCount", { count }));
        return eta ? <span className="tabular-nums">{eta}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "position",
      header: t("table.position"),
      width: "72px",
      align: "end",
      mobile: "hidden",
      numeric: true,
      muted: true,
      cell: (m) => m.position ?? 0,
    },
    {
      id: "status",
      header: t("table.status"),
      width: "100px",
      mobile: "end",
      cell: (m) => <ActivePill active={m.is_active} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("table.actions")}</span>,
      width: "64px",
      align: "end",
      mobile: "actions",
      cell: (m) => (
        <span className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            className={rdButton.ghostIconSm}
            onClick={() => handleEdit(m)}
            aria-label={t("editAria", { name: getName(m) })}
            title={t("editMethod")}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className={`${rdButton.ghostIconSm} hover:text-destructive`}
            onClick={() => setDeletingMethod(m)}
            aria-label={t("deleteAria", { name: getName(m) })}
            title={t("deleteDialog.confirm")}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ),
    },
  ];

  const showEmpty = !loading && !loadError && methods.length === 0;

  return (
    <>
      <EcommerceHeaderBridge
        sub={!loading && !loadError ? t("totalMethods", { count: methods.length }) : null}
        primary={{ label: t("addMethod"), icon: Plus, onClick: handleAdd, testId: "shipping-add" }}
      />
      <EcPage width="wide" testId="shipping-methods-page">
        {showEmpty ? (
          <div className="rounded-[10px] border bg-card">
            <EcEmptyState
              icon={Truck}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <button type="button" className={rdButton.primary} onClick={handleAdd}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t("addFirst")}
                </button>
              }
            />
          </div>
        ) : (
          <EcTable
            ariaLabel={t("tableTitle")}
            variant="card"
            columns={columns}
            rows={loading && methods.length === 0 ? undefined : methods}
            rowKey={(m) => m.id}
            onRowClick={handleEdit}
            error={loadError}
            onRetry={fetchMethods}
            skeletonRows={4}
            testId="shipping-methods-table"
            footer={
              !loadError && methods.length > 0 ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("totalMethods", { count: methods.length })}
                </span>
              ) : undefined
            }
          />
        )}
      </EcPage>

      {/* Add/Edit Sheet */}
      <FormSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && handleCloseSheet()}
        title={editingMethod ? t("editMethod") : t("addMethod")}
        description={editingMethod ? t("editMethodDesc") : t("addMethodDesc")}
        size="md"
        onSubmit={handleSave}
        submitting={saving}
        submitLabel={saving ? t("saving") : t("save")}
        cancelLabel={t("cancel")}
        testId="shipping-sheet"
      >
        <FormSection title={t("form.sectionName")}>
          <FormGrid>
            <FormField label={t("form.nameEn")} htmlFor="shipping-name-en">
              <Input
                id="shipping-name-en"
                className={ecField.input}
                value={typeof form.name === "object" ? form.name?.en || "" : form.name || ""}
                onChange={(e) => setName("en", e.target.value)}
              />
            </FormField>
            <FormField label={t("form.nameKa")} htmlFor="shipping-name-ka">
              <Input
                id="shipping-name-ka"
                className={ecField.input}
                value={typeof form.name === "object" ? form.name?.ka || "" : ""}
                onChange={(e) => setName("ka", e.target.value)}
              />
            </FormField>
          </FormGrid>
          <FormField label={t("form.descriptionEn")} htmlFor="shipping-desc-en">
            <Input
              id="shipping-desc-en"
              className={ecField.input}
              value={
                typeof form.description === "object"
                  ? form.description?.en || ""
                  : form.description || ""
              }
              onChange={(e) => setDescription("en", e.target.value)}
            />
          </FormField>
          <FormField label={t("form.descriptionKa")} htmlFor="shipping-desc-ka">
            <Input
              id="shipping-desc-ka"
              className={ecField.input}
              value={typeof form.description === "object" ? form.description?.ka || "" : ""}
              onChange={(e) => setDescription("ka", e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection title={t("form.sectionPricing")}>
          <FormGrid>
            <FormField label={t("form.price")} htmlFor="shipping-price" help={t("form.priceHelp")}>
              <MoneyInput
                id="shipping-price"
                value={form.price || ""}
                onChange={(value) => setForm({ ...form, price: value })}
              />
            </FormField>
            <FormField
              label={t("form.freeShippingThreshold")}
              htmlFor="shipping-free-threshold"
              help={t("form.freeShippingPlaceholder")}
            >
              <MoneyInput
                id="shipping-free-threshold"
                value={form.free_shipping_threshold || ""}
                onChange={(value) => setForm({ ...form, free_shipping_threshold: value })}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title={t("form.sectionDelivery")}>
          <FormGrid>
            <FormField label={t("form.estimatedDays")} htmlFor="shipping-estimated-days">
              <Input
                id="shipping-estimated-days"
                type="number"
                min="0"
                className={`${ecField.input} tabular-nums`}
                value={form.estimated_days ?? ""}
                onChange={(e) =>
                  setForm({ ...form, estimated_days: parseInt(e.target.value) || 0 })
                }
              />
            </FormField>
            <FormField label={t("form.position")} htmlFor="shipping-position" help={t("form.positionHelp")}>
              <Input
                id="shipping-position"
                type="number"
                min="0"
                className={`${ecField.input} tabular-nums`}
                value={form.position ?? ""}
                onChange={(e) =>
                  setForm({ ...form, position: parseInt(e.target.value) || 0 })
                }
              />
            </FormField>
          </FormGrid>
          <FormSwitchRow label={t("form.isActive")} help={t("form.isActiveHelp")} htmlFor="shipping-is-active">
            <Switch
              id="shipping-is-active"
              checked={form.is_active ?? true}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </FormSwitchRow>
        </FormSection>
      </FormSheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingMethod}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                name: deletingMethod ? getName(deletingMethod) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
