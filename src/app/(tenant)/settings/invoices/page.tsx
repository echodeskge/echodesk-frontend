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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Image as ImageIcon, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
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
      <div className="p-6">
        <p>{t("loadingSettings")}</p>
      </div>
    );
  }

  const renderBankAccountForm = (isEditing: boolean) => (
    <Card className="p-4 space-y-4 border-dashed">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("settings.bankName")} *</Label>
          <Input
            value={editForm.bank_name}
            onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
            placeholder={t("settings.bankName")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settings.accountNumber")} *</Label>
          <Input
            value={editForm.account_number}
            onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
            placeholder={t("settings.accountNumber")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("settings.iban")}</Label>
          <Input
            value={editForm.iban}
            onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
            placeholder={t("settings.iban")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settings.swiftCode")}</Label>
          <Input
            value={editForm.swift}
            onChange={(e) => setEditForm({ ...editForm, swift: e.target.value })}
            placeholder={t("settings.swiftCode")}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_default"
          checked={editForm.is_default}
          onCheckedChange={(checked) => setEditForm({ ...editForm, is_default: !!checked })}
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          {t("settings.setAsDefault")}
        </Label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={cancelEditing}>
          {t("actions.cancel")}
        </Button>
        <Button
          type="button"
          onClick={isEditing ? handleUpdateAccount : handleAddAccount}
          disabled={!editForm.bank_name || !editForm.account_number || savingBankAccounts}
        >
          {savingBankAccounts
            ? t("settings.saving")
            : isEditing
            ? t("settings.saveSettings")
            : t("settings.addBankAccount")}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">{t("settings.tabs.company")}</TabsTrigger>
          <TabsTrigger value="branding">{t("settings.tabs.branding")}</TabsTrigger>
          <TabsTrigger value="defaults">{t("settings.tabs.defaults")}</TabsTrigger>
          <TabsTrigger value="bankAccounts">{t("settings.tabs.bankAccounts")}</TabsTrigger>
          <TabsTrigger value="email">{t("settings.tabs.email")}</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Company Information Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t("settings.companyInfo")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">{t("settings.form.companyName")} *</Label>
                  <Input
                    id="company_name"
                    {...register("company_name", { required: t("form.required") })}
                  />
                  {errors.company_name && (
                    <p className="text-sm text-destructive">{errors.company_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_id">{t("settings.form.taxId")}</Label>
                  <Input id="tax_id" {...register("tax_id")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("settings.form.address")}</Label>
                <Textarea id="address" {...register("address")} rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("settings.form.phone")}</Label>
                  <Input id="phone" type="tel" {...register("phone")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("settings.form.email")}</Label>
                  <Input id="email" type="email" {...register("email")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t("settings.form.website")}</Label>
                <Input id="website" type="url" {...register("website")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_itemlist">{t("settings.form.clientItemList")}</Label>
                <Select
                  key={`itemlist-select-${availableItemLists?.length ?? "loading"}`}
                  value={clientItemListValue?.toString() || "none"}
                  onValueChange={(value) => {
                    setValue("client_itemlist", value === "none" ? null : parseInt(value), { shouldDirty: true });
                  }}
                >
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">
                  {t("settings.form.clientItemListHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materials_itemlist">{t("settings.form.materialsItemList")}</Label>
                <Select
                  key={`materials-select-${availableItemLists?.length ?? "loading"}`}
                  value={materialsItemListValue?.toString() || "none"}
                  onValueChange={(value) => {
                    setValue("materials_itemlist", value === "none" ? null : parseInt(value), { shouldDirty: true });
                  }}
                >
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">
                  {t("settings.form.materialsItemListHint")}
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">{t("settings.branding")}</h3>

              {/* Logo */}
              <div className="space-y-3">
                <Label>{t("settings.form.logo")}</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {settings?.logo ? (
                    <div className="relative">
                      <img
                        src={settings.logo}
                        alt="Logo"
                        className="h-20 w-auto object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleRemoveFile("logo")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-20 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, "logo")}
                      disabled={uploadingLogo}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("settings.form.logoHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="space-y-3">
                <Label>{t("settings.form.badge")}</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {settings?.badge ? (
                    <div className="relative">
                      <img
                        src={settings.badge}
                        alt="Badge"
                        className="h-20 w-auto object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleRemoveFile("badge")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-20 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, "badge")}
                      disabled={uploadingBadge}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("settings.form.badgeHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-3">
                <Label>{t("settings.form.signature")}</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {settings?.signature ? (
                    <div className="relative">
                      <img
                        src={settings.signature}
                        alt="Signature"
                        className="h-20 w-auto object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => handleRemoveFile("signature")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-20 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e.target.files?.[0] || null, "signature")
                      }
                      disabled={uploadingSignature}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("settings.form.signatureHint")}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Invoice Defaults Tab */}
          <TabsContent value="defaults" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t("settings.invoiceConfig")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix">{t("settings.form.invoicePrefix")}</Label>
                  <Input id="invoice_prefix" {...register("invoice_prefix")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="starting_number">
                    {t("settings.form.nextInvoiceNumber")}
                  </Label>
                  <Input
                    id="starting_number"
                    type="number"
                    {...register("starting_number")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_currency">{t("settings.form.defaultCurrency")}</Label>
                  <Select
                    value={defaultCurrencyValue || "GEL"}
                    onValueChange={(value) => setValue("default_currency", value, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEL">GEL (₾)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_tax_rate">{t("settings.form.defaultTaxRate")}</Label>
                  <Input
                    id="default_tax_rate"
                    type="number"
                    step="0.01"
                    {...register("default_tax_rate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_due_days">{t("settings.form.defaultDueDays")}</Label>
                  <Input id="default_due_days" type="number" {...register("default_due_days")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_terms">
                  {t("settings.form.defaultTerms")}
                </Label>
                <Textarea
                  id="default_terms"
                  {...register("default_terms")}
                  rows={6}
                  placeholder={t("settings.form.defaultTermsPlaceholder")}
                />
              </div>
            </Card>
          </TabsContent>

          {/* Email Settings Tab */}
          <TabsContent value="email" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t("settings.emailSettings")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_from">{t("settings.form.emailFrom")}</Label>
                  <Input id="email_from" type="email" {...register("email_from")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_cc">{t("settings.form.emailCc")}</Label>
                  <Input id="email_cc" type="email" {...register("email_cc")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_subject_template">
                  {t("settings.form.emailSubject")}
                </Label>
                <Input id="email_subject_template" {...register("email_subject_template")} />
                <p className="text-xs text-muted-foreground">
                  {t("settings.form.emailSubjectHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_message_template">
                  {t("settings.form.emailMessage")}
                </Label>
                <Textarea
                  id="email_message_template"
                  {...register("email_message_template")}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.form.emailMessageHint")}
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Save Button (for all tabs except bankAccounts) */}
          <TabsContent value="company">
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="branding">
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="defaults">
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="email">
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </TabsContent>
        </form>

        {/* Bank Accounts Tab (outside form - saves independently) */}
        <TabsContent value="bankAccounts" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-semibold">{t("settings.bankAccounts")}</h3>
              {!showAddForm && editingIndex === null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(true);
                    setEditForm(emptyAccount);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("settings.addBankAccount")}
                </Button>
              )}
            </div>

            {/* Existing bank accounts list */}
            {bankAccounts.length === 0 && !showAddForm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t("settings.noBankAccounts")}</p>
                <p className="text-sm mt-1">{t("settings.noBankAccountsHint")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account, index) => (
                  <div key={index}>
                    {editingIndex === index ? (
                      renderBankAccountForm(true)
                    ) : (
                      <Card className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{account.bank_name}</span>
                              {account.is_default && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {t("settings.defaultAccount")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {account.account_number}
                            </p>
                            {account.iban && (
                              <p className="text-sm text-muted-foreground">
                                IBAN: {account.iban}
                              </p>
                            )}
                            {account.swift && (
                              <p className="text-sm text-muted-foreground">
                                SWIFT: {account.swift}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!account.is_default && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefault(index)}
                              >
                                {t("settings.setAsDefault")}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAccount(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new account form */}
            {showAddForm && renderBankAccountForm(false)}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
