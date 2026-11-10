'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Textarea } from '@/components/ui/textarea';
import { rdButton } from '@/components/redesign/buttons';
import { FieldRow, SettingsSection, SettingsToggle, settingsInputClass } from '@/components/redesign/settings';
import { SectionBlock, StackLabel, textareaClass } from '@/components/social/settings-blocks';
import { cn } from '@/lib/utils';

type LocaleText = Record<string, string>;

export interface WidgetProactiveSectionProps {
  enabled: boolean;
  message: LocaleText;
  delaySeconds: number;
  saving?: boolean;
  onToggle: (enabled: boolean) => void;
  onSave: (payload: {
    proactive_message: LocaleText;
    proactive_delay_seconds: number;
  }) => Promise<void> | void;
}

/**
 * Tenant-configurable proactive message: after N seconds on the page,
 * widget.js flashes a speech-bubble next to the floating button to nudge
 * the visitor. Supports per-language text (en + ka) matching the other
 * localized widget fields.
 */
export function WidgetProactiveSection({
  enabled,
  message,
  delaySeconds,
  saving = false,
  onToggle,
  onSave,
}: WidgetProactiveSectionProps) {
  const t = useTranslations('social.widget.proactive');

  const [en, setEn] = useState(message.en || '');
  const [ka, setKa] = useState(message.ka || '');
  const [delay, setDelay] = useState<number>(Math.max(1, delaySeconds || 30));

  useEffect(() => {
    setEn(message.en || '');
    setKa(message.ka || '');
    setDelay(Math.max(1, delaySeconds || 30));
  }, [message.en, message.ka, delaySeconds]);

  const hasChanges =
    en !== (message.en || '') ||
    ka !== (message.ka || '') ||
    delay !== (delaySeconds || 30);

  const handleSave = async () => {
    const safeDelay = Number.isFinite(delay) && delay > 0 ? Math.floor(delay) : 30;
    await onSave({
      proactive_message: { en: en.trim(), ka: ka.trim() },
      proactive_delay_seconds: safeDelay,
    });
  };

  return (
    <SettingsSection title={t('title')} hint={t('description')} testId="widget-proactive">
      <FieldRow label={t('enableLabel')} help={t('enableHelp')} htmlFor="widget_proactive_enabled" align="center">
        <SettingsToggle
          id="widget_proactive_enabled"
          checked={enabled}
          disabled={saving}
          onCheckedChange={onToggle}
          aria-label={t('enableLabel')}
        />
      </FieldRow>

      <div className={enabled ? undefined : 'pointer-events-none opacity-60'}>
        <SectionBlock>
          <StackLabel htmlFor="widget_proactive_message_en" label={t('messageEn')} />
          <Textarea
            id="widget_proactive_message_en"
            className={textareaClass}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder={t('messagePlaceholderEn')}
            rows={2}
            disabled={!enabled || saving}
            maxLength={200}
          />
          <StackLabel htmlFor="widget_proactive_message_ka" label={t('messageKa')} />
          <Textarea
            id="widget_proactive_message_ka"
            className={textareaClass}
            value={ka}
            onChange={(e) => setKa(e.target.value)}
            placeholder={t('messagePlaceholderKa')}
            rows={2}
            disabled={!enabled || saving}
            maxLength={200}
          />
        </SectionBlock>

        <FieldRow label={t('delayLabel')} help={t('delayHelp')} htmlFor="widget_proactive_delay">
          <div className="flex items-center gap-2">
            <input
              id="widget_proactive_delay"
              type="number"
              min={1}
              max={3600}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              disabled={!enabled || saving}
              className={cn(settingsInputClass, 'w-24 font-mono tabular-nums')}
            />
            <span className="text-xs text-muted-foreground">{t('delayUnit')}</span>
          </div>
        </FieldRow>

        <div className="flex justify-end px-4 py-3">
          <button
            type="button"
            className={rdButton.primarySm}
            disabled={!hasChanges || saving || !enabled}
            onClick={() => void handleSave()}
            data-testid="widget-proactive-save"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
