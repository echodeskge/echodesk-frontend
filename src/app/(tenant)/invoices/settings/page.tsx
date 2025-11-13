"use client";

/**
 * Invoice Settings Page
 * Configure company information, branding, and invoice defaults
 */

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    values: settings
      ? {
          company_name: settings.company_name || "",
          tax_id: settings.tax_id || "",
          address: settings.address || "",
          phone: settings.phone || "",
          email: settings.email || "",
          website: settings.website || "",
          client_itemlist: settings.client_itemlist || null,
          invoice_prefix: settings.invoice_prefix || "INV",
          next_invoice_number: settings.next_invoice_number || 1,
          default_currency: settings.default_currency || "GEL",
          default_tax_rate: settings.default_tax_rate || "18",
          default_due_days: settings.default_due_days || 30,
          email_from: settings.email_from || "",
          email_cc: settings.email_cc || "",
          email_subject_template: settings.email_subject_template || "",
          email_message_template: settings.email_message_template || "",
          default_terms_conditions: settings.default_terms_conditions || "",
        }
      : undefined,
  });

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

  if (isLoading) {
    return (
      <div className="p-6">
        <p>{t("loadingSettings")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
                  value={settings?.client_itemlist?.toString() || "none"}
                  onValueChange={(value) => setValue("client_itemlist", value === "none" ? null : parseInt(value))}
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
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">{t("settings.branding")}</h3>

              {/* Logo */}
              <div className="space-y-3">
                <Label>{t("settings.form.logo")}</Label>
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-4">
                  {settings?.document_badge ? (
                    <div className="relative">
                      <img
                        src={settings.document_badge}
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
                <div className="flex items-center gap-4">
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
              <h3 className="text-lg font-semibold">{t("settings.invoiceDefaults")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix">{t("settings.form.invoicePrefix")}</Label>
                  <Input id="invoice_prefix" {...register("invoice_prefix")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_invoice_number">
                    {t("settings.form.nextInvoiceNumber")}
                  </Label>
                  <Input
                    id="next_invoice_number"
                    type="number"
                    {...register("next_invoice_number")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_currency">{t("settings.form.defaultCurrency")}</Label>
                  <Select
                    value={settings?.default_currency}
                    onValueChange={(value) => setValue("default_currency", value)}
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
                <Label htmlFor="default_terms_conditions">
                  {t("settings.form.defaultTerms")}
                </Label>
                <Textarea
                  id="default_terms_conditions"
                  {...register("default_terms_conditions")}
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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? t("settings.saving") : t("settings.saveSettings")}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
