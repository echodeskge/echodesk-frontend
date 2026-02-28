"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeneralSettingsSkeleton } from "@/components/GeneralSettingsSkeleton";
import { Upload, Image as ImageIcon, X, Languages } from "lucide-react";
import { toast } from "sonner";
import { useTenantSettings, useUpdateTenantSettings, useUploadTenantLogo, useRemoveTenantLogo } from "@/hooks/api";
import { locales, localeNames, type Locale } from "@/lib/i18n";

interface TenantSettings {
  logo?: string;
  company_name?: string;
  min_users_per_ticket?: number;
  only_superadmin_can_delete_tickets?: boolean;
}

export default function GeneralSettingsPage() {
  const t = useTranslations('settings.general');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const currentLocale = useLocale() as Locale;
  const [isLocaleChanging, startLocaleTransition] = useTransition();

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formSettings, setFormSettings] = useState<TenantSettings>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use React Query hooks
  const { data: settingsData, isLoading: loading } = useTenantSettings();
  const updateSettings = useUpdateTenantSettings();
  const uploadLogo = useUploadTenantLogo();
  const removeLogo = useRemoveTenantLogo();

  const saving = updateSettings.isPending;
  const uploading = uploadLogo.isPending;

  // Initialize form settings when data loads
  useEffect(() => {
    if (settingsData) {
      setFormSettings(settingsData);
      if (settingsData.logo && !logoPreview) {
        setLogoPreview(settingsData.logo);
      }
    }
  }, [settingsData, logoPreview]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await uploadLogo.mutateAsync(formData);
      setLogoPreview(response.logo_url);
      toast.success('Logo uploaded successfully');

      // Reload the page after a short delay to refresh tenant info (including logo in sidebar)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      toast.error(err.response?.data?.error || 'Failed to upload logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo.mutateAsync();
      setLogoPreview(null);
      toast.success('Logo removed successfully');

      // Reload the page after a short delay to refresh tenant info (including logo in sidebar)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to remove logo:', err);
      toast.error(err.response?.data?.error || 'Failed to remove logo');
    }
  };

  const handleSaveTicketSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        min_users_per_ticket: formSettings.min_users_per_ticket || 0,
        only_superadmin_can_delete_tickets: formSettings.only_superadmin_can_delete_tickets || false,
      });
      toast.success('Ticket settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save ticket settings:', err);
      const errorMessage = err.response?.data?.error ||
                           err.response?.data?.detail ||
                           err.response?.data?.message ||
                           'Failed to save ticket settings';
      toast.error(errorMessage);
    }
  };

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Set cookie via server action
    await fetch('/api/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    });

    // Refresh the page to apply new locale
    startLocaleTransition(() => {
      router.refresh();
    });
  };

  if (loading) {
    return <GeneralSettingsSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <div>
              <Label>{t('logoLabel')}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('logoDescription')}
              </p>
            </div>

            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative group">
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {t('uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {logoPreview ? t('changeLogo') : t('uploadLogo')}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('logoRequirements')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('languageTitle') || 'Language'}
          </CardTitle>
          <CardDescription>
            {t('languageDescription') || 'Choose your preferred display language'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label>{t('languageSelect') || 'Display language'}</Label>
              <p className="text-sm text-muted-foreground">
                {t('languageSelectDescription') || 'This will change the language across the entire application'}
              </p>
            </div>
            <Select value={currentLocale} onValueChange={(v) => handleLocaleChange(v as Locale)} disabled={isLocaleChanging}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {localeNames[loc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ticketSettingsTitle')}</CardTitle>
          <CardDescription>{t('ticketSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Users Per Ticket */}
          <div className="space-y-2">
            <Label htmlFor="min_users_per_ticket">{t('minUsersLabel')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('minUsersDescription')}
            </p>
            <Input
              id="min_users_per_ticket"
              type="number"
              min="0"
              value={formSettings.min_users_per_ticket || 0}
              onChange={(e) => setFormSettings(prev => ({
                ...prev,
                min_users_per_ticket: parseInt(e.target.value) || 0
              }))}
              className="max-w-xs"
            />
          </div>

          {/* Only Superadmin Can Delete Tickets */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="only_superadmin_can_delete_tickets"
              checked={formSettings.only_superadmin_can_delete_tickets || false}
              onCheckedChange={(checked) => setFormSettings(prev => ({
                ...prev,
                only_superadmin_can_delete_tickets: checked === true
              }))}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="only_superadmin_can_delete_tickets"
                className="cursor-pointer font-medium"
              >
                {t('onlySuperadminDeleteLabel')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('onlySuperadminDeleteDescription')}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveTicketSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {tCommon('saving')}
                </>
              ) : (
                tCommon('save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
