"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ecommerceAdminPromoCodesList,
  ecommerceAdminPromoCodesCreate,
  ecommerceAdminPromoCodesUpdate,
  ecommerceAdminPromoCodesDestroy,
} from "@/api/generated";
import type { PromoCode, PromoCodeRequest } from "@/api/generated/interfaces";
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
import { Plus, Tag } from "lucide-react";
import { getApiErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CURRENCY_SIGN,
  EcEmptyState,
  EcPage,
  EcTable,
  EcommerceHeaderBridge,
  FormField,
  FormGrid,
  FormSection,
  FormSheet,
  FormSwitchRow,
  Segmented,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
  ecField,
  isoToDateTimeLocal,
  rdButton,
} from "../_components/ui";
import { getPromoColumns } from "./_components/promo-columns";

type StatusFilter = "all" | "active" | "inactive" | "expired";
type TypeFilter = "all" | "percentage" | "fixed";


const EMPTY_FORM: PromoCodeRequest = {
  code: "",
  discount_type: "percentage" as unknown as PromoCodeRequest["discount_type"],
  discount_value: "0",
  min_order_amount: "",
  max_uses: undefined,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export default function PromoCodesPage() {
  const t = useTranslations("promoCodes");
  const tu = useTranslations("ecommerceUi");
  const locale = useLocale();

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoCodeRequest>({ ...EMPTY_FORM });

  const [deletingCode, setDeletingCode] = useState<PromoCode | null>(null);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ecommerceAdminPromoCodesList();
      setCodes(response.results || []);
      setLoaded(true);
    } catch (error) {
      setError(error);
      toast.error(getApiErrorMessage(error, t("fetchError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const isExpired = (code: PromoCode): boolean => {
    return new Date(code.valid_until) < new Date();
  };

  const isMaxedOut = (code: PromoCode): boolean => {
    return code.max_uses !== undefined && code.max_uses !== null && code.times_used >= code.max_uses;
  };

  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      !searchQuery ||
      code.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "all" || String(code.discount_type) === typeFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && code.is_active && !isExpired(code) && !isMaxedOut(code)) ||
      (statusFilter === "inactive" && !code.is_active) ||
      (statusFilter === "expired" && isExpired(code));

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setEditingCode(null);
    setForm({ ...EMPTY_FORM });
    setSheetOpen(true);
  };

  const handleEdit = (code: PromoCode) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_order_amount: code.min_order_amount || "",
      max_uses: code.max_uses,
      valid_from: isoToDateTimeLocal(code.valid_from),
      valid_until: isoToDateTimeLocal(code.valid_until),
      is_active: code.is_active ?? true,
    });
    setSheetOpen(true);
  };

  const validateForm = (): boolean => {
    if (!form.code.trim()) {
      toast.error(t("validation.codeRequired"));
      return false;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast.error(t("validation.discountValuePositive"));
      return false;
    }
    if (form.valid_from && form.valid_until) {
      if (new Date(form.valid_from) >= new Date(form.valid_until)) {
        toast.error(t("validation.validFromBeforeUntil"));
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : "",
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : "",
      };
      if (editingCode) {
        await ecommerceAdminPromoCodesUpdate(editingCode.id, payload);
        toast.success(t("updateSuccess"));
      } else {
        await ecommerceAdminPromoCodesCreate(payload);
        toast.success(t("createSuccess"));
      }
      setSheetOpen(false);
      fetchCodes();
    } catch (error) {
      toast.error(getApiErrorMessage(error, editingCode ? t("updateError") : t("createError")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      await ecommerceAdminPromoCodesDestroy(deletingCode.id);
      toast.success(t("deleteSuccess"));
      setDeletingCode(null);
      fetchCodes();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("deleteError")));
    }
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingCode(null);
  };

  const now = new Date();
  const columns = getPromoColumns({ t, locale, now, onEdit: handleEdit, onDelete: setDeletingCode });
  const filtered = !!searchQuery || typeFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
  };
  // First load = skeleton; refetches after a save keep the rows on screen.
  const showSkeleton = !loaded && loading;
  const isPercentage = String(form.discount_type) === "percentage";

  return (
    <>
      <EcommerceHeaderBridge
        sub={loaded ? t("codesFound", { count: filteredCodes.length }) : null}
        primary={{ label: t("addCode"), icon: Plus, onClick: handleAdd, testId: "promo-add" }}
      />
      <EcPage fill testId="promo-codes-page">
        <Toolbar testId="promo-toolbar">
          <Segmented<StatusFilter>
            ariaLabel={t("filterByStatus")}
            value={statusFilter}
            onChange={setStatusFilter}
            testId="promo-status-filter"
            options={[
              { value: "all", label: tu("all") },
              { value: "active", label: t("statuses.active") },
              { value: "inactive", label: t("statuses.inactive") },
              { value: "expired", label: t("statuses.expired") },
            ]}
          />
          <Segmented<TypeFilter>
            ariaLabel={t("filterByType")}
            value={typeFilter}
            onChange={setTypeFilter}
            testId="promo-type-filter"
            options={[
              { value: "all", label: t("types.all") },
              { value: "percentage", label: t("types.percentage") },
              { value: "fixed", label: t("types.fixed") },
            ]}
          />
          <ToolbarSpacer />
          <ToolbarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
            clearLabel={tu("clearSearch")}
            testId="promo-search"
          />
        </Toolbar>
        <EcTable
          ariaLabel={t("codesTitle")}
          variant="fill"
          columns={columns}
          rows={showSkeleton ? undefined : filteredCodes}
          rowKey={(c) => c.id}
          error={loaded ? undefined : error}
          onRetry={fetchCodes}
          onRowClick={handleEdit}
          testId="promo-table"
          empty={
            filtered ? (
              <EcEmptyState
                icon={Tag}
                title={t("emptyTitle")}
                description={t("emptyFiltered")}
                action={
                  <button type="button" className={rdButton.outlineSm} onClick={clearFilters}>
                    {tu("clearFilters")}
                  </button>
                }
              />
            ) : (
              <EcEmptyState
                icon={Tag}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                  <button type="button" className={rdButton.primarySm} onClick={handleAdd}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {t("addCode")}
                  </button>
                }
              />
            )
          }
          footer={loaded && codes.length > 0 ? <span>{t("codesFound", { count: filteredCodes.length })}</span> : undefined}
        />
      </EcPage>

      {/* Add/Edit Sheet */}
      <FormSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && handleCloseSheet()}
        title={editingCode ? t("editCode") : t("addCode")}
        description={editingCode ? t("editCodeDesc") : t("addCodeDesc")}
        size="md"
        onSubmit={handleSave}
        submitting={saving}
        submitLabel={saving ? t("saving") : t("save")}
        cancelLabel={t("cancel")}
        testId="promo-sheet"
      >
        <FormSection title={t("form.sectionCode")} hint={t("form.codeHint")}>
          <FormField label={t("form.code")} htmlFor="promo-code" required>
            <Input
              id="promo-code"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              placeholder="SUMMER2024"
              autoComplete="off"
              spellCheck={false}
              className={cn(ecField.input, "font-mono uppercase tracking-wide")}
            />
          </FormField>
        </FormSection>
        <FormSection title={t("form.sectionDiscount")}>
          <FormField label={t("form.discountType")}>
            <Segmented
              size="md"
              ariaLabel={t("form.discountType")}
              value={isPercentage ? "percentage" : "fixed"}
              onChange={(val) =>
                setForm({
                  ...form,
                  discount_type: val as unknown as PromoCodeRequest["discount_type"],
                })
              }
              options={[
                { value: "percentage", label: t("types.percentage") },
                { value: "fixed", label: t("types.fixed") },
              ]}
              testId="promo-form-type"
              className="self-start"
            />
          </FormField>
          <FormGrid>
            <FormField label={t("form.discountValue")} htmlFor="promo-discount-value" required>
              <div className="relative">
                <Input
                  id="promo-discount-value"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm({ ...form, discount_value: e.target.value })
                  }
                  className={cn(ecField.input, "pe-8 tabular-nums")}
                />
                <span aria-hidden className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {isPercentage ? "%" : CURRENCY_SIGN}
                </span>
              </div>
            </FormField>
            <FormField label={t("form.minOrderAmount")} htmlFor="promo-min-order">
              <div className="relative">
                <Input
                  id="promo-min-order"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={form.min_order_amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, min_order_amount: e.target.value })
                  }
                  placeholder={t("form.minOrderPlaceholder")}
                  className={cn(ecField.input, "pe-8 tabular-nums")}
                />
                <span aria-hidden className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {CURRENCY_SIGN}
                </span>
              </div>
            </FormField>
          </FormGrid>
        </FormSection>
        <FormSection title={t("form.sectionLimits")}>
          <FormField label={t("form.maxUses")} htmlFor="promo-max-uses">
            <Input
              id="promo-max-uses"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.max_uses ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  max_uses: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder={t("form.maxUsesPlaceholder")}
              className={cn(ecField.input, "tabular-nums sm:max-w-[50%]")}
            />
          </FormField>
        </FormSection>
        <FormSection title={t("form.sectionValidity")}>
          <FormGrid>
            <FormField label={t("form.validFrom")} htmlFor="promo-valid-from" required>
              <Input
                id="promo-valid-from"
                type="datetime-local"
                value={form.valid_from ? form.valid_from.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm({ ...form, valid_from: e.target.value })
                }
                className={cn(ecField.input, "tabular-nums")}
              />
            </FormField>
            <FormField label={t("form.validUntil")} htmlFor="promo-valid-until" required>
              <Input
                id="promo-valid-until"
                type="datetime-local"
                value={form.valid_until ? form.valid_until.slice(0, 16) : ""}
                onChange={(e) =>
                  setForm({ ...form, valid_until: e.target.value })
                }
                className={cn(ecField.input, "tabular-nums")}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        <FormSection title={t("form.sectionStatus")}>
          <FormSwitchRow label={t("form.isActive")} help={t("form.activeHint")} htmlFor="promo-is-active">
            <Switch
              id="promo-is-active"
              checked={form.is_active ?? true}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_active: checked })
              }
            />
          </FormSwitchRow>
        </FormSection>
      </FormSheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCode}
        onOpenChange={(open) => !open && setDeletingCode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description", {
                code: deletingCode?.code || "",
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
