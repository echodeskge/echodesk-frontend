"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { GeneralSettingsSkeleton } from "@/components/GeneralSettingsSkeleton";
import { Upload, Image as ImageIcon, X, Settings, Loader2 } from "lucide-react";
import {
  ActionButton,
  ChoiceControl,
  FieldRow,
  SettingsFormPage,
  SettingsSection,
  SettingsToggle,
  StickySaveBar,
  settingsInputClass,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import { useSettingsSaveBarLabels } from "../_lib/settings-ui-labels";
import { toast } from "sonner";
import { useTenantSettings, useUpdateTenantSettings, useUploadTenantLogo, useRemoveTenantLogo } from "@/hooks/api";
import { locales, localeNames, type Locale } from "@/lib/i18n";
import { syncPreferredLanguage } from "@/lib/preferredLanguage";
import { useMyAccess } from "@/hooks/useMyAccess";

interface TenantSettings {
  logo?: string;
  company_name?: string;
  min_users_per_ticket?: number;
  only_superadmin_can_delete_tickets?: boolean;
}

export default function GeneralSettingsPage() {
  const t = useTranslations('settings.general');
  const tCommon = useTranslations('common');
  const { isStaffOrSuperuser } = useMyAccess();
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

  const saveBarLabels = useSettingsSaveBarLabels();
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
      toast.error(t('toasts.invalidImage'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('toasts.tooLarge'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await uploadLogo.mutateAsync(formData);
      setLogoPreview(response.logo_url);
      toast.success(t('toasts.logoUploaded'));

      // Reload the page after a short delay to refresh tenant info (including logo in sidebar)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      toast.error(err.response?.data?.error || t('toasts.logoUploadFailed'));
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await removeLogo.mutateAsync();
      setLogoPreview(null);
      toast.success(t('toasts.logoRemoved'));

      // Reload the page after a short delay to refresh tenant info (including logo in sidebar)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to remove logo:', err);
      toast.error(err.response?.data?.error || t('toasts.logoRemoveFailed'));
    }
  };

  const handleSaveTicketSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        min_users_per_ticket: formSettings.min_users_per_ticket || 0,
        only_superadmin_can_delete_tickets: formSettings.only_superadmin_can_delete_tickets || false,
      });
      toast.success(t('toasts.ticketSaved'));
    } catch (err: any) {
      console.error('Failed to save ticket settings:', err);
      const errorMessage = err.response?.data?.error ||
                           err.response?.data?.detail ||
                           err.response?.data?.message ||
                           t('toasts.ticketSaveFailed');
      toast.error(errorMessage);
    }
  };

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Also make it this user's notification language (best effort, not awaited).
    void syncPreferredLanguage(newLocale);

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

  // The ticket settings keep their explicit save (now in the sticky save bar).
  // Dirty = differs from the last loaded values, compared the way the save
  // sends them; Discard puts the loaded values back.
  const loadedMinUsers = settingsData?.min_users_per_ticket || 0;
  const loadedOnlySuperadmin = settingsData?.only_superadmin_can_delete_tickets || false;
  const ticketDirty =
    !!settingsData &&
    ((formSettings.min_users_per_ticket || 0) !== loadedMinUsers ||
      (formSettings.only_superadmin_can_delete_tickets || false) !== loadedOnlySuperadmin);
  const handleDiscardTicketSettings = () => {
    if (settingsData) setFormSettings(settingsData);
  };

  if (loading) {
    return <GeneralSettingsSkeleton />;
  }

  return (
    <SettingsFormPage icon={Settings} title={t('title')} description={t('description')} testId="settings-general">
      {/* Branding: logo upload / remove save instantly, as before. */}
      <SettingsSection title={t('sections.branding')} testId="general-branding">
        <FieldRow label={t('logoLabel')} help={t('logoDescription')}>
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted text-muted-foreground"
              data-testid="general-logo-preview"
            >
              {logoPreview ? (
                <img src={logoPreview} alt={t('logoLabel')} className="max-h-full max-w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
                data-testid="general-logo-input"
              />
              <div className="flex flex-wrap gap-1.5">
                <ActionButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  testId="general-logo-upload"
                >
                  {uploading ? (
                    <Loader2 className="h-[13px] w-[13px] animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-[13px] w-[13px]" aria-hidden />
                  )}
                  {uploading ? t('uploading') : logoPreview ? t('changeLogo') : t('uploadLogo')}
                </ActionButton>
                {logoPreview && (
                  <ActionButton
                    tone="danger"
                    icon={X}
                    onClick={handleRemoveLogo}
                    disabled={uploading}
                    testId="general-logo-remove"
                  >
                    {tCommon('remove')}
                  </ActionButton>
                )}
              </div>
              <span className="text-[11px] leading-4 text-muted-foreground">{t('logoRequirements')}</span>
            </div>
          </div>
        </FieldRow>
      </SettingsSection>

      {/* Language: applies instantly (cookie + refresh), as before. */}
      <SettingsSection title={t('languageTitle')} hint={t('languageDescription')} testId="general-language">
        <FieldRow label={t('languageSelect')} help={t('languageSelectDescription')} align="center">
          <ChoiceControl<Locale>
            value={currentLocale}
            onChange={(v) => handleLocaleChange(v)}
            options={locales.map((loc) => ({ value: loc, label: localeNames[loc], disabled: isLocaleChanging }))}
            ariaLabel={t('languageSelect')}
            testId="general-locale"
          />
        </FieldRow>
      </SettingsSection>

      {/* Ticket settings: explicit save through the sticky save bar. */}
      <SettingsSection title={t('ticketSettingsTitle')} hint={t('ticketSettingsDescription')} testId="general-tickets">
        <FieldRow label={t('minUsersLabel')} help={t('minUsersDescription')} htmlFor="min_users_per_ticket">
          <input
            id="min_users_per_ticket"
            type="number"
            min="0"
            value={formSettings.min_users_per_ticket || 0}
            onChange={(e) => setFormSettings(prev => ({
              ...prev,
              min_users_per_ticket: parseInt(e.target.value) || 0
            }))}
            className={cn(settingsInputClass, "w-full tabular-nums sm:w-[120px]")}
          />
        </FieldRow>
        <FieldRow
          label={t('onlySuperadminDeleteLabel')}
          help={t('onlySuperadminDeleteDescription')}
          htmlFor="only_superadmin_can_delete_tickets"
          align="center"
        >
          <SettingsToggle
            id="only_superadmin_can_delete_tickets"
            // Only staff or superusers may change this; others resend it unchanged.
            disabled={!isStaffOrSuperuser}
            checked={formSettings.only_superadmin_can_delete_tickets || false}
            onCheckedChange={(checked) => setFormSettings(prev => ({
              ...prev,
              only_superadmin_can_delete_tickets: checked === true
            }))}
          />
        </FieldRow>
      </SettingsSection>

      <StickySaveBar
        dirty={ticketDirty}
        saving={saving}
        onSave={handleSaveTicketSettings}
        onDiscard={handleDiscardTicketSettings}
        labels={saveBarLabels}
      />
    </SettingsFormPage>
  );
}
