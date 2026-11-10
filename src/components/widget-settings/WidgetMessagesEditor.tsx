'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { rdButton } from '@/components/redesign/buttons';
import { FieldRow, SettingsSection, SettingsToggle } from '@/components/redesign/settings';
import { SectionBlock, StackLabel, textareaClass } from '@/components/social/settings-blocks';
import { toast } from 'sonner';

type LocaleText = Record<string, string>;

export interface PreChatFormConfig {
  enabled?: boolean;
  name_required?: boolean;
  email_required?: boolean;
  [k: string]: unknown;
}

interface WidgetMessagesEditorProps {
  welcomeMessage: LocaleText;
  offlineMessage: LocaleText;
  preChatForm: PreChatFormConfig;
  onSave: (next: {
    welcome_message: LocaleText;
    offline_message: LocaleText;
    pre_chat_form: PreChatFormConfig;
  }) => Promise<void> | void;
  saving?: boolean;
}

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Edits the localized welcome/offline messages and the pre-chat form toggles.
 * Uses an explicit Save button: these are text fields where autosaving on each
 * keystroke would be jarring.
 */
export function WidgetMessagesEditor({
  welcomeMessage,
  offlineMessage,
  preChatForm,
  onSave,
  saving = false,
}: WidgetMessagesEditorProps) {
  const t = useTranslations('social.widget.messages');

  const [welcomeEn, setWelcomeEn] = useState(asText(welcomeMessage?.en));
  const [welcomeKa, setWelcomeKa] = useState(asText(welcomeMessage?.ka));
  const [offlineEn, setOfflineEn] = useState(asText(offlineMessage?.en));
  const [offlineKa, setOfflineKa] = useState(asText(offlineMessage?.ka));
  const [formEnabled, setFormEnabled] = useState(Boolean(preChatForm?.enabled));
  const [nameRequired, setNameRequired] = useState(Boolean(preChatForm?.name_required));
  const [emailRequired, setEmailRequired] = useState(Boolean(preChatForm?.email_required));

  // Re-sync when props change (e.g. switching between widgets).
  useEffect(() => {
    setWelcomeEn(asText(welcomeMessage?.en));
    setWelcomeKa(asText(welcomeMessage?.ka));
  }, [welcomeMessage]);
  useEffect(() => {
    setOfflineEn(asText(offlineMessage?.en));
    setOfflineKa(asText(offlineMessage?.ka));
  }, [offlineMessage]);
  useEffect(() => {
    setFormEnabled(Boolean(preChatForm?.enabled));
    setNameRequired(Boolean(preChatForm?.name_required));
    setEmailRequired(Boolean(preChatForm?.email_required));
  }, [preChatForm]);

  const handleSave = async () => {
    try {
      await onSave({
        welcome_message: { en: welcomeEn, ka: welcomeKa },
        offline_message: { en: offlineEn, ka: offlineKa },
        pre_chat_form: {
          ...preChatForm,
          enabled: formEnabled,
          name_required: nameRequired,
          email_required: emailRequired,
        },
      });
      toast.success(t('saved'));
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || t('saveFailed'));
    }
  };

  return (
    <SettingsSection title={t('title')} hint={t('description')} testId="widget-messages">
      {/* Welcome message */}
      <SectionBlock>
        <span className="text-[13px] font-semibold">{t('welcomeHeading')}</span>
        <StackLabel htmlFor="welcome_en" label={t('english')} />
        <Textarea
          id="welcome_en"
          rows={2}
          className={textareaClass}
          value={welcomeEn}
          onChange={(e) => setWelcomeEn(e.target.value)}
          placeholder={t('welcomePlaceholderEn')}
        />
        <StackLabel htmlFor="welcome_ka" label={t('georgian')} />
        <Textarea
          id="welcome_ka"
          rows={2}
          className={textareaClass}
          value={welcomeKa}
          onChange={(e) => setWelcomeKa(e.target.value)}
          placeholder={t('welcomePlaceholderKa')}
        />
      </SectionBlock>

      {/* Offline message */}
      <SectionBlock>
        <span className="text-[13px] font-semibold">{t('offlineHeading')}</span>
        <StackLabel htmlFor="offline_en" label={t('english')} />
        <Textarea
          id="offline_en"
          rows={2}
          className={textareaClass}
          value={offlineEn}
          onChange={(e) => setOfflineEn(e.target.value)}
          placeholder={t('offlinePlaceholderEn')}
        />
        <StackLabel htmlFor="offline_ka" label={t('georgian')} />
        <Textarea
          id="offline_ka"
          rows={2}
          className={textareaClass}
          value={offlineKa}
          onChange={(e) => setOfflineKa(e.target.value)}
          placeholder={t('offlinePlaceholderKa')}
        />
      </SectionBlock>

      {/* Pre-chat form */}
      <FieldRow label={t('preChatHeading')} help={t('preChatDescription')} htmlFor="pre_chat_enabled" align="center">
        <SettingsToggle
          id="pre_chat_enabled"
          checked={formEnabled}
          onCheckedChange={setFormEnabled}
          aria-label={t('preChatHeading')}
        />
      </FieldRow>
      <div
        className={formEnabled ? undefined : 'pointer-events-none'}
        aria-disabled={!formEnabled}
      >
        <FieldRow label={t('nameRequired')} help={t('nameRequiredHint')} htmlFor="pre_chat_name_required" align="center" disabled={!formEnabled} className="sm:ps-8">
          <SettingsToggle
            id="pre_chat_name_required"
            checked={nameRequired}
            onCheckedChange={setNameRequired}
            disabled={!formEnabled}
          />
        </FieldRow>
        <FieldRow label={t('emailRequired')} help={t('emailRequiredHint')} htmlFor="pre_chat_email_required" align="center" disabled={!formEnabled} className="sm:ps-8">
          <SettingsToggle
            id="pre_chat_email_required"
            checked={emailRequired}
            onCheckedChange={setEmailRequired}
            disabled={!formEnabled}
          />
        </FieldRow>
      </div>

      <div className="flex justify-end border-t px-4 py-3">
        <button type="button" className={rdButton.primarySm} onClick={handleSave} disabled={saving} data-testid="widget-messages-save">
          {saving ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" aria-hidden />
              {t('save')}
            </>
          )}
        </button>
      </div>
    </SettingsSection>
  );
}
