'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Welcome message */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t('welcomeHeading')}</h4>
          <div className="space-y-2">
            <Label htmlFor="welcome_en">{t('english')}</Label>
            <Textarea
              id="welcome_en"
              rows={2}
              value={welcomeEn}
              onChange={(e) => setWelcomeEn(e.target.value)}
              placeholder={t('welcomePlaceholderEn')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome_ka">{t('georgian')}</Label>
            <Textarea
              id="welcome_ka"
              rows={2}
              value={welcomeKa}
              onChange={(e) => setWelcomeKa(e.target.value)}
              placeholder={t('welcomePlaceholderKa')}
            />
          </div>
        </div>

        <Separator />

        {/* Offline message */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t('offlineHeading')}</h4>
          <div className="space-y-2">
            <Label htmlFor="offline_en">{t('english')}</Label>
            <Textarea
              id="offline_en"
              rows={2}
              value={offlineEn}
              onChange={(e) => setOfflineEn(e.target.value)}
              placeholder={t('offlinePlaceholderEn')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline_ka">{t('georgian')}</Label>
            <Textarea
              id="offline_ka"
              rows={2}
              value={offlineKa}
              onChange={(e) => setOfflineKa(e.target.value)}
              placeholder={t('offlinePlaceholderKa')}
            />
          </div>
        </div>

        <Separator />

        {/* Pre-chat form */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium text-sm">{t('preChatHeading')}</h4>
              <p className="text-xs text-muted-foreground">{t('preChatDescription')}</p>
            </div>
            <Switch
              id="pre_chat_enabled"
              checked={formEnabled}
              onCheckedChange={setFormEnabled}
              aria-label={t('preChatHeading')}
            />
          </div>

          <div
            className={
              formEnabled
                ? 'space-y-3 pl-1'
                : 'pointer-events-none space-y-3 pl-1 opacity-50'
            }
            aria-disabled={!formEnabled}
          >
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="pre_chat_name_required" className="font-medium">
                  {t('nameRequired')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('nameRequiredHint')}</p>
              </div>
              <Switch
                id="pre_chat_name_required"
                checked={nameRequired}
                onCheckedChange={setNameRequired}
                disabled={!formEnabled}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="pre_chat_email_required" className="font-medium">
                  {t('emailRequired')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('emailRequiredHint')}</p>
              </div>
              <Switch
                id="pre_chat_email_required"
                checked={emailRequired}
                onCheckedChange={setEmailRequired}
                disabled={!formEnabled}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('save')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
