'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown, Plug, RefreshCw, Settings2 } from 'lucide-react';
import { useConnectEmail, type EmailConnectRequest } from '@/hooks/api/useSocial';
import { rdButton } from '@/components/redesign/buttons';
import {
  FieldRow,
  SecretInput,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from '@/components/redesign/settings';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/** IMAP/SMTP servers of the common providers, keyed by the e-mail domain. */
export const EMAIL_PROVIDER_PRESETS: Record<string, Partial<EmailConnectRequest>> = {
  'gmail.com': { imap_server: 'imap.gmail.com', imap_port: 993, smtp_server: 'smtp.gmail.com', smtp_port: 587 },
  'googlemail.com': { imap_server: 'imap.gmail.com', imap_port: 993, smtp_server: 'smtp.gmail.com', smtp_port: 587 },
  'outlook.com': { imap_server: 'outlook.office365.com', imap_port: 993, smtp_server: 'smtp.office365.com', smtp_port: 587 },
  'hotmail.com': { imap_server: 'outlook.office365.com', imap_port: 993, smtp_server: 'smtp.office365.com', smtp_port: 587 },
  'live.com': { imap_server: 'outlook.office365.com', imap_port: 993, smtp_server: 'smtp.office365.com', smtp_port: 587 },
  'yahoo.com': { imap_server: 'imap.mail.yahoo.com', imap_port: 993, smtp_server: 'smtp.mail.yahoo.com', smtp_port: 587 },
  'icloud.com': { imap_server: 'imap.mail.me.com', imap_port: 993, smtp_server: 'smtp.mail.me.com', smtp_port: 587 },
};

/** The provider chips of the onboarding sheet (label + the preset domain). */
export const EMAIL_PROVIDER_CHIPS: Array<{ key: 'gmail' | 'outlook' | 'yahoo'; label: string; domain: string }> = [
  { key: 'gmail', label: 'Gmail', domain: 'gmail.com' },
  { key: 'outlook', label: 'Outlook', domain: 'outlook.com' },
  { key: 'yahoo', label: 'Yahoo', domain: 'yahoo.com' },
];

export function emptyEmailConnectRequest(): EmailConnectRequest {
  return {
    email_address: '',
    display_name: '',
    imap_server: '',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_server: '',
    smtp_port: 587,
    smtp_use_tls: true,
    smtp_use_ssl: false,
    username: '',
    password: '',
    sync_folder: 'INBOX',
    sync_days_back: 30,
  };
}

const fieldLabel = 'text-xs font-medium text-muted-foreground';

/**
 * The "Add email account" form (mailbox credentials over IMAP/SMTP) with the
 * provider presets filled from the address domain and the advanced settings
 * collapsed. Posts to `/api/social/email/connect/`; shared by the Settings →
 * Connections e-mail card and the onboarding Inbox step.
 */
export function EmailConnectForm({
  onConnected,
  onCancel,
  showProviderChips = false,
  className,
}: {
  onConnected?: () => void;
  onCancel?: () => void;
  /** Gmail / Outlook / Yahoo chips that apply the provider's servers. */
  showProviderChips?: boolean;
  className?: string;
}) {
  const t = useTranslations('social.emailConnection');
  const connectEmail = useConnectEmail();
  const [formData, setFormData] = useState<EmailConnectRequest>(emptyEmailConnectRequest);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyPreset = (domain: string) => {
    const preset = EMAIL_PROVIDER_PRESETS[domain];
    if (preset) setFormData((prev) => ({ ...prev, ...preset }));
  };

  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email_address: email, username: email }));
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) applyPreset(domain);
  };

  const handleConnect = async () => {
    if (!formData.email_address || !formData.password || !formData.imap_server || !formData.smtp_server) {
      toast.error(t('requiredFields'));
      return;
    }
    try {
      await connectEmail.mutateAsync(formData);
      toast.success(t('connected'));
      setFormData(emptyEmailConnectRequest());
      onConnected?.();
    } catch (error: unknown) {
      console.error('Failed to connect email:', error);
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.details || t('connectFailed'));
    }
  };

  return (
    <div className={cn('flex flex-col gap-3.5 px-4 py-3.5', className)} data-testid="email-connect-form">
      {showProviderChips && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="email-provider-chips">
          {EMAIL_PROVIDER_CHIPS.map((chip) => {
            const preset = EMAIL_PROVIDER_PRESETS[chip.domain];
            const on = !!preset && formData.imap_server === preset.imap_server;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => applyPreset(chip.domain)}
                aria-pressed={on}
                className={cn(
                  'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors',
                  on ? 'border-primary bg-primary/5 text-foreground' : 'border-dashed text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                data-testid={`email-provider-${chip.key}`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('emailAddress')}</span>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            className={settingsInputClass}
            value={formData.email_address}
            onChange={(e) => handleEmailChange(e.target.value)}
            data-testid="email-connect-address"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('displayName')}</span>
          <input
            id="display_name"
            className={settingsInputClass}
            placeholder={t('displayNamePlaceholder')}
            value={formData.display_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
          />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="password" className={fieldLabel}>{t('passwordRequired')}</label>
          <SecretInput
            id="password"
            mono={false}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            placeholder={t('passwordPlaceholder')}
            autoComplete="new-password"
            showLabel={t('showPassword')}
            hideLabel={t('hidePassword')}
            testId="email-connect-password"
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)_88px]">
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('imapServer')}</span>
          <input
            id="imap_server"
            className={settingsInputClass}
            placeholder="imap.example.com"
            value={formData.imap_server}
            onChange={(e) => setFormData((prev) => ({ ...prev, imap_server: e.target.value }))}
            data-testid="email-connect-imap"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('imapPort')}</span>
          <input
            id="imap_port"
            type="number"
            className={cn(settingsInputClass, 'font-mono tabular-nums')}
            value={formData.imap_port}
            onChange={(e) => setFormData((prev) => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('smtpServer')}</span>
          <input
            id="smtp_server"
            className={settingsInputClass}
            placeholder="smtp.example.com"
            value={formData.smtp_server}
            onChange={(e) => setFormData((prev) => ({ ...prev, smtp_server: e.target.value }))}
            data-testid="email-connect-smtp"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className={fieldLabel}>{t('smtpPort')}</span>
          <input
            id="smtp_port"
            type="number"
            className={cn(settingsInputClass, 'font-mono tabular-nums')}
            value={formData.smtp_port}
            onChange={(e) => setFormData((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
          />
        </label>
      </div>

      <p className="text-xs leading-[17px] text-muted-foreground">{t('addHint')}</p>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex h-9 w-full items-center justify-between gap-2 px-3 text-[13px] font-medium hover:bg-accent/60">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t('advanced')}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showAdvanced && 'rotate-180')} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <FieldRow label={t('username')} htmlFor="username" align="center">
            <input
              id="username"
              className={cn(settingsInputClass, settingsFieldWidth)}
              placeholder={t('usernamePlaceholder')}
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            />
          </FieldRow>
          <FieldRow label={t('imapSsl')} htmlFor="imap_ssl" align="center">
            <SettingsToggle
              id="imap_ssl"
              checked={formData.imap_use_ssl}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, imap_use_ssl: checked }))}
            />
          </FieldRow>
          <FieldRow label={t('smtpTls')} htmlFor="smtp_tls" align="center">
            <SettingsToggle
              id="smtp_tls"
              checked={formData.smtp_use_tls}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, smtp_use_tls: checked, smtp_use_ssl: checked ? false : prev.smtp_use_ssl }))
              }
            />
          </FieldRow>
          <FieldRow label={t('smtpSsl')} htmlFor="smtp_ssl" align="center">
            <SettingsToggle
              id="smtp_ssl"
              checked={formData.smtp_use_ssl}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, smtp_use_ssl: checked, smtp_use_tls: checked ? false : prev.smtp_use_tls }))
              }
            />
          </FieldRow>
          <FieldRow label={t('syncFolder')} htmlFor="sync_folder" align="center">
            <input
              id="sync_folder"
              className={cn(settingsInputClass, settingsFieldWidth)}
              value={formData.sync_folder}
              onChange={(e) => setFormData((prev) => ({ ...prev, sync_folder: e.target.value }))}
            />
          </FieldRow>
          <FieldRow label={t('syncDaysBack')} htmlFor="sync_days" align="center">
            <input
              id="sync_days"
              type="number"
              min={1}
              max={365}
              className={cn(settingsInputClass, 'w-28 font-mono tabular-nums')}
              value={formData.sync_days_back}
              onChange={(e) => setFormData((prev) => ({ ...prev, sync_days_back: parseInt(e.target.value) || 30 }))}
            />
          </FieldRow>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" className={rdButton.outline} onClick={onCancel} data-testid="email-connect-cancel">
            {t('cancel')}
          </button>
        )}
        <button type="button" onClick={handleConnect} className={rdButton.primary} disabled={connectEmail.isPending} data-testid="email-connect-submit">
          {connectEmail.isPending ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t('connecting')}
            </>
          ) : (
            <>
              <Plug className="h-3.5 w-3.5" aria-hidden />
              {t('connect')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
