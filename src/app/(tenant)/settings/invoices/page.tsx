"use client";

/**
 * Invoice Settings Page
 * Configure company information, branding, invoice defaults, bank accounts, and email
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  useInvoiceSettings,
  useUpdateInvoiceSettings,
  useUploadLogo,
  useUploadBadge,
  useUploadSignature,
  useRemoveLogo,
  useRemoveBadge,
  useRemoveSignature,
  useAvailableItemLists,
} from "@/hooks/useInvoices";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Image as ImageIcon, Plus, Pencil, Trash2, Building2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/redesign/segmented";
import { TonePill } from "@/components/redesign/pill";
import { EmptyBlock, LoadingBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import {
  ActionButton,
  FieldRow,
  SettingsFormPage,
  SettingsSection,
  StickySaveBar,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";

type InvoiceTab = "company" | "branding" | "defaults" | "bankAccounts" | "email";
const FORM_ID = "invoice-settings-form";

interface BankAccount {
  bank_name: string;
  account_number: string;
  iban: string;
  swift: string;
  is_default: boolean;
}

const emptyAccount: BankAccount = {
  bank_name: "",
  account_number: "",
  iban: "",
  swift: "",
  is_default: false,
};

export default function InvoiceSettingsPage() {
  const t = useTranslations("invoices");
  const { toast } = useToast();

  const { data: settings, isLoading } = useInvoiceSettings();
  const { data: availableItemLists } = useAvailableItemLists();
  const updateMutation = useUpdateInvoiceSettings();
  const uploadLogoMutation = useUploadLogo();
  const uploadBadgeMutation = useUploadBadge();
  const uploadSignatureMutation = useUploadSignature();
  const removeLogoMutation = useRemoveLogo();
  const removeBadgeMutation = useRemoveBadge();
  const removeSignatureMutation = useRemoveSignature();

  const [tab, setTab] = useState<InvoiceTab>("company");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Bank accounts state (managed separately from react-hook-form)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountsInitialized, setBankAccountsInitialized] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BankAccount>(emptyAccount);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingBankAccounts, setSavingBankAccounts] = useState(false);

  // Initialize bank accounts from settings when loaded
  if (settings && !bankAccountsInitialized) {
    setBankAccounts(settings.bank_accounts || []);
    setBankAccountsInitialized(true);
  }

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    values: settings
      ? {
          company_name: settings.company_name || "",
          tax_id: settings.tax_id || "",
          registration_number: settings.registration_number || "",
          address: settings.address || "",
          phone: settings.phone || "",
          email: settings.email || "",
          website: settings.website || "",
          client_itemlist: settings.client_itemlist || null,
          materials_itemlist: (settings as any).materials_itemlist || null,
          invoice_prefix: settings.invoice_prefix || "INV",
          starting_number: settings.starting_number || 1,
          default_currency: settings.default_currency || "GEL",
          default_tax_rate: settings.default_tax_rate || "18",
          default_due_days: settings.default_due_days || 30,
          email_from: settings.email_from || "",
          email_from_name: settings.email_from_name || "",
          email_cc: settings.email_cc || "",
          email_subject_template: settings.email_subject_template || "Invoice {invoice_number} from {company_name}",
          email_message_template: settings.email_message_template || "",
          footer_text: settings.footer_text || "",
          default_terms: settings.default_terms || "",
        }
      : undefined,
  });

  const clientItemListValue = watch("client_itemlist");
  const materialsItemListValue = watch("materials_itemlist");
  const defaultCurrencyValue = watch("default_currency");

  const handleFileUpload = async (
    file: File | null,
    type: "logo" | "badge" | "signature"
  ) => {
    if (!file) return;

    const mutation =
      type === "logo"
        ? uploadLogoMutation
        : type === "badge"
        ? uploadBadgeMutation
        : uploadSignatureMutation;

    const setUploading =
      type === "logo"
        ? setUploadingLogo
        : type === "badge"
        ? setUploadingBadge
        : setUploadingSignature;

    try {
      setUploading(true);
      await mutation.mutateAsync(file);
      toast({
        title: t("success.uploaded"),
        description: t("success.uploadedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.uploadFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (type: "logo" | "badge" | "signature") => {
    const mutation =
      type === "logo"
        ? removeLogoMutation
        : type === "badge"
        ? removeBadgeMutation
        : removeSignatureMutation;

    try {
      await mutation.mutateAsync();
      toast({
        title: t("success.removed"),
        description: t("success.removedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.removeFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({
        title: t("success.settingsSaved"),
        description: t("success.settingsSavedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Bank account handlers
  const saveBankAccounts = useCallback(async (accounts: BankAccount[]) => {
    setSavingBankAccounts(true);
    try {
      await updateMutation.mutateAsync({ bank_accounts: accounts } as any);
      toast({
        title: t("success.settingsSaved"),
        description: t("success.settingsSavedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.saveFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingBankAccounts(false);
    }
  }, [updateMutation, toast, t]);

  const handleAddAccount = () => {
    if (!editForm.bank_name || !editForm.account_number) return;

    const newAccounts = [...bankAccounts];
    // If setting as default, clear other defaults
    if (editForm.is_default) {
      newAccounts.forEach((a) => (a.is_default = false));
    }
    // If this is the first account, make it default
    if (newAccounts.length === 0) {
      editForm.is_default = true;
    }
    newAccounts.push({ ...editForm });
    setBankAccounts(newAccounts);
    setEditForm(emptyAccount);
    setShowAddForm(false);
    saveBankAccounts(newAccounts);
  };

  const handleUpdateAccount = () => {
    if (editingIndex === null || !editForm.bank_name || !editForm.account_number) return;

    const newAccounts = [...bankAccounts];
    // If setting as default, clear other defaults
    if (editForm.is_default) {
      newAccounts.forEach((a) => (a.is_default = false));
    }
    newAccounts[editingIndex] = { ...editForm };
    setBankAccounts(newAccounts);
    setEditingIndex(null);
    setEditForm(emptyAccount);
    saveBankAccounts(newAccounts);
  };

  const handleRemoveAccount = (index: number) => {
    const newAccounts = bankAccounts.filter((_, i) => i !== index);
    // If removed account was default and there are other accounts, make first one default
    if (bankAccounts[index].is_default && newAccounts.length > 0) {
      newAccounts[0].is_default = true;
    }
    setBankAccounts(newAccounts);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditForm(emptyAccount);
    }
    saveBankAccounts(newAccounts);
  };

  const handleSetDefault = (index: number) => {
    const newAccounts = bankAccounts.map((a, i) => ({
      ...a,
      is_default: i === index,
    }));
    setBankAccounts(newAccounts);
    saveBankAccounts(newAccounts);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...bankAccounts[index] });
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(emptyAccount);
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <section className="w-full p-4 sm:p-6">
        <LoadingBlock label={t("loadingSettings")} testId="invoice-settings-loading" />
      </section>
    );
  }

  const inputClass = cn(settingsInputClass, settingsFieldWidth);
  const selectClass = cn("h-[34px] text-[13px]", settingsFieldWidth);

  const renderBankAccountForm = (isEditing: boolean) => (
    <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3.5 last:border-b-0" data-testid="bank-account-form">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("settings.bankName")} *</span>
          <input
            className={settingsInputClass}
            value={editForm.bank_name}
            onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
            placeholder={t("settings.bankName")}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("settings.accountNumber")} *</span>
          <input
            className={settingsInputClass}
            value={editForm.account_number}
            onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
            placeholder={t("settings.accountNumber")}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("settings.iban")}</span>
          <input
            className={settingsInputClass}
            value={editForm.iban}
            onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
            placeholder={t("settings.iban")}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("settings.swiftCode")}</span>
          <input
            className={settingsInputClass}
            value={editForm.swift}
            onChange={(e) => setEditForm({ ...editForm, swift: e.target.value })}
            placeholder={t("settings.swiftCode")}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_default"
          checked={editForm.is_default}
          onCheckedChange={(checked) => setEditForm({ ...editForm, is_default: !!checked })}
        />
        <Label htmlFor="is_default" className="cursor-pointer text-[13px] font-normal">
          {t("settings.setAsDefault")}
        </Label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={rdButton.outline} onClick={cancelEditing}>
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          className={rdButton.primary}
          onClick={isEditing ? handleUpdateAccount : handleAddAccount}
          disabled={!editForm.bank_name || !editForm.account_number || savingBankAccounts}
        >
          {savingBankAccounts
            ? t("settings.saving")
            : isEditing
            ? t("settings.saveSettings")
            : t("settings.addBankAccount")}
        </button>
      </div>
    </div>
  );

  const renderImageRow = (
    type: "logo" | "badge" | "signature",
    label: string,
    hint: string,
    src: string | null | undefined,
    alt: string,
    uploading: boolean,
    removeLabel: string
  ) => (
    <FieldRow label={label} help={hint}>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {src ? (
          <div className="relative">
            <img src={src} alt={alt} className="h-16 w-auto max-w-[160px] rounded-md border object-contain" />
            <button
              type="button"
              className="absolute -end-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => handleRemoveFile(type)}
              aria-label={removeLabel}
              title={removeLabel}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border-2 border-dashed text-muted-foreground">
            <ImageIcon className="h-6 w-6" aria-hidden />
          </div>
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files?.[0] || null, type)}
          disabled={uploading}
          className="h-[34px] w-full max-w-[240px] text-[13px]"
        />
      </div>
    </FieldRow>
  );

  const TABS: { value: InvoiceTab; label: string }[] = [
    { value: "company", label: t("settings.tabs.company") },
    { value: "branding", label: t("settings.tabs.branding") },
    { value: "defaults", label: t("settings.tabs.defaults") },
    { value: "bankAccounts", label: t("settings.tabs.bankAccounts") },
    { value: "email", label: t("settings.tabs.email") },
  ];

  return (
    <SettingsFormPage icon={Receipt} title={t("settings.title")} description={t("settings.subtitle")} testId="invoice-settings-page">
      <Segmented size="md" value={tab} onChange={setTab} options={TABS} ariaLabel={t("settings.title")} className="max-w-full self-start" testId="invoice-settings-tabs" />

      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="contents">
        {/* Company Information Tab */}
        {tab === "company" && (
          <SettingsSection title={t("settings.companyInfo")}>
            <FieldRow label={`${t("settings.form.companyName")} *`} htmlFor="company_name">
              <div className={cn("flex flex-col gap-1", settingsFieldWidth)}>
                <input
                  id="company_name"
                  className={settingsInputClass}
                  aria-invalid={!!errors.company_name}
                  {...register("company_name", { required: t("form.required") })}
                />
                {errors.company_name && (
                  <p className="text-xs text-destructive">{errors.company_name.message as string}</p>
                )}
              </div>
            </FieldRow>
            <FieldRow label={t("settings.form.taxId")} htmlFor="tax_id">
              <input id="tax_id" className={inputClass} {...register("tax_id")} />
            </FieldRow>
            <FieldRow label={t("settings.form.address")} htmlFor="address">
              <Textarea id="address" {...register("address")} rows={3} className={cn("text-[13px]", settingsFieldWidth)} />
            </FieldRow>
            <FieldRow label={t("settings.form.phone")} htmlFor="phone">
              <input id="phone" type="tel" className={inputClass} {...register("phone")} />
            </FieldRow>
            <FieldRow label={t("settings.form.email")} htmlFor="email">
              <input id="email" type="email" className={inputClass} {...register("email")} />
            </FieldRow>
            <FieldRow label={t("settings.form.website")} htmlFor="website">
              <input id="website" type="url" className={inputClass} {...register("website")} />
            </FieldRow>
            <FieldRow label={t("settings.form.clientItemList")} help={t("settings.form.clientItemListHint")} htmlFor="client_itemlist">
              <Select
                key={`itemlist-select-${availableItemLists?.length ?? "loading"}`}
                value={clientItemListValue?.toString() || "none"}
                onValueChange={(value) => {
                  setValue("client_itemlist", value === "none" ? null : parseInt(value), { shouldDirty: true });
                }}
              >
                <SelectTrigger id="client_itemlist" className={selectClass}>
                  <SelectValue placeholder={t("settings.form.selectItemList")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {availableItemLists?.map((itemList: any) => (
                    <SelectItem key={itemList.id} value={itemList.id.toString()}>
                      {itemList.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label={t("settings.form.materialsItemList")} help={t("settings.form.materialsItemListHint")} htmlFor="materials_itemlist">
              <Select
                key={`materials-select-${availableItemLists?.length ?? "loading"}`}
                value={materialsItemListValue?.toString() || "none"}
                onValueChange={(value) => {
                  setValue("materials_itemlist", value === "none" ? null : parseInt(value), { shouldDirty: true });
                }}
              >
                <SelectTrigger id="materials_itemlist" className={selectClass}>
                  <SelectValue placeholder={t("settings.form.selectItemList")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {availableItemLists?.map((itemList: any) => (
                    <SelectItem key={itemList.id} value={itemList.id.toString()}>
                      {itemList.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </SettingsSection>
        )}

        {/* Branding Tab: uploads and removals apply at once */}
        {tab === "branding" && (
          <SettingsSection title={t("settings.branding")}>
            {renderImageRow("logo", t("settings.form.logo"), t("settings.form.logoHint"), settings?.logo, "Logo", uploadingLogo, t("settings.removeLogo"))}
            {renderImageRow("badge", t("settings.form.badge"), t("settings.form.badgeHint"), settings?.badge, "Badge", uploadingBadge, t("settings.removeBadge"))}
            {renderImageRow("signature", t("settings.form.signature"), t("settings.form.signatureHint"), settings?.signature, "Signature", uploadingSignature, t("settings.removeSignature"))}
          </SettingsSection>
        )}

        {/* Invoice Defaults Tab */}
        {tab === "defaults" && (
          <SettingsSection title={t("settings.invoiceConfig")}>
            <FieldRow label={t("settings.form.invoicePrefix")} htmlFor="invoice_prefix">
              <input id="invoice_prefix" className={inputClass} {...register("invoice_prefix")} />
            </FieldRow>
            <FieldRow label={t("settings.form.nextInvoiceNumber")} htmlFor="starting_number">
              <input id="starting_number" type="number" className={cn(settingsInputClass, "w-32")} {...register("starting_number")} />
            </FieldRow>
            <FieldRow label={t("settings.form.defaultCurrency")} htmlFor="default_currency">
              <Select
                value={defaultCurrencyValue || "GEL"}
                onValueChange={(value) => setValue("default_currency", value, { shouldDirty: true })}
              >
                <SelectTrigger id="default_currency" className={cn("h-[34px] w-40 text-[13px]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEL">GEL (₾)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label={t("settings.form.defaultTaxRate")} htmlFor="default_tax_rate">
              <input id="default_tax_rate" type="number" step="0.01" className={cn(settingsInputClass, "w-32")} {...register("default_tax_rate")} />
            </FieldRow>
            <FieldRow label={t("settings.form.defaultDueDays")} htmlFor="default_due_days">
              <input id="default_due_days" type="number" className={cn(settingsInputClass, "w-32")} {...register("default_due_days")} />
            </FieldRow>
            <div className="flex flex-col gap-2 px-4 py-3.5">
              <label htmlFor="default_terms" className="text-[13px] font-medium">
                {t("settings.form.defaultTerms")}
              </label>
              <Textarea
                id="default_terms"
                {...register("default_terms")}
                rows={6}
                className="text-[13px]"
                placeholder={t("settings.form.defaultTermsPlaceholder")}
              />
            </div>
          </SettingsSection>
        )}

        {/* Email Settings Tab */}
        {tab === "email" && (
          <SettingsSection title={t("settings.emailSettings")}>
            <FieldRow label={t("settings.form.emailFrom")} htmlFor="email_from">
              <input id="email_from" type="email" className={inputClass} {...register("email_from")} />
            </FieldRow>
            <FieldRow label={t("settings.form.emailCc")} htmlFor="email_cc">
              <input id="email_cc" type="email" className={inputClass} {...register("email_cc")} />
            </FieldRow>
            <FieldRow label={t("settings.form.emailSubject")} help={t("settings.form.emailSubjectHint")} htmlFor="email_subject_template">
              <input id="email_subject_template" className={inputClass} {...register("email_subject_template")} />
            </FieldRow>
            <div className="flex flex-col gap-2 px-4 py-3.5">
              <label htmlFor="email_message_template" className="text-[13px] font-medium">
                {t("settings.form.emailMessage")}
              </label>
              <Textarea id="email_message_template" {...register("email_message_template")} rows={8} className="text-[13px]" />
              <p className="text-xs leading-[17px] text-muted-foreground">{t("settings.form.emailMessageHint")}</p>
            </div>
          </SettingsSection>
        )}
      </form>

      {/* Bank Accounts Tab (outside the form - saves independently, at once) */}
      {tab === "bankAccounts" && (
        <SettingsSection
          title={t("settings.bankAccounts")}
          actions={
            !showAddForm && editingIndex === null ? (
              <ActionButton
                icon={Plus}
                onClick={() => {
                  setShowAddForm(true);
                  setEditForm(emptyAccount);
                }}
              >
                {t("settings.addBankAccount")}
              </ActionButton>
            ) : undefined
          }
        >
          {bankAccounts.length === 0 && !showAddForm ? (
            <EmptyBlock icon={Building2} title={t("settings.noBankAccounts")} description={t("settings.noBankAccountsHint")} />
          ) : (
            bankAccounts.map((account, index) =>
              editingIndex === index ? (
                <div key={index}>{renderBankAccountForm(true)}</div>
              ) : (
                <div
                  key={index}
                  className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center"
                  data-testid="bank-account-row"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{account.bank_name}</span>
                      {account.is_default && <TonePill tone="info">{t("settings.defaultAccount")}</TonePill>}
                    </span>
                    <span className="break-all font-mono text-xs text-muted-foreground">{account.account_number}</span>
                    {account.iban && <span className="break-all text-xs text-muted-foreground">IBAN: {account.iban}</span>}
                    {account.swift && <span className="text-xs text-muted-foreground">SWIFT: {account.swift}</span>}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {!account.is_default && (
                      <button type="button" className={rdButton.outlineSm} onClick={() => handleSetDefault(index)}>
                        {t("settings.setAsDefault")}
                      </button>
                    )}
                    <button
                      type="button"
                      className={rdButton.ghostIconSm}
                      onClick={() => startEditing(index)}
                      aria-label={t("settings.editBankAccount")}
                      title={t("settings.editBankAccount")}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={cn(rdButton.ghostIconSm, "text-destructive hover:text-destructive")}
                      onClick={() => handleRemoveAccount(index)}
                      aria-label={t("settings.removeBankAccount")}
                      title={t("settings.removeBankAccount")}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              )
            )
          )}
          {showAddForm && renderBankAccountForm(false)}
        </SettingsSection>
      )}

      {/* The Save of the company / branding / defaults / email tabs, now in the save bar:
          it submits the same form (handleSubmit(onSubmit)). Bank accounts save on their own. */}
      {tab !== "bankAccounts" && (
        <StickySaveBar
          mode="always"
          formId={FORM_ID}
          dirty={isDirty}
          saving={isSubmitting}
          onDiscard={() => reset()}
          labels={{
            unsaved: t("settings.saveBar.unsaved"),
            discard: t("settings.saveBar.discard"),
            save: t("settings.saveSettings"),
            saving: t("settings.saving"),
            saved: t("settings.saveBar.saved"),
          }}
          testId="invoice-settings-savebar"
        />
      )}
    </SettingsFormPage>
  );
}
