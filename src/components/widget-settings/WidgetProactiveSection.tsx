'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('description')}</p>

        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="widget_proactive_enabled" className="font-medium">
              {t('enableLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('enableHelp')}</p>
          </div>
          <Switch
            id="widget_proactive_enabled"
            checked={enabled}
            disabled={saving}
            onCheckedChange={onToggle}
            aria-label={t('enableLabel')}
          />
        </div>

        <div className={enabled ? 'space-y-4' : 'space-y-4 opacity-60 pointer-events-none'}>
          <div className="space-y-2">
            <Label htmlFor="widget_proactive_message_en" className="text-sm font-medium">
              {t('messageEn')}
            </Label>
            <Textarea
              id="widget_proactive_message_en"
              value={en}
              onChange={(e) => setEn(e.target.value)}
              placeholder={t('messagePlaceholderEn')}
              rows={2}
              disabled={!enabled || saving}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget_proactive_message_ka" className="text-sm font-medium">
              {t('messageKa')}
            </Label>
            <Textarea
              id="widget_proactive_message_ka"
              value={ka}
              onChange={(e) => setKa(e.target.value)}
              placeholder={t('messagePlaceholderKa')}
              rows={2}
              disabled={!enabled || saving}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="widget_proactive_delay" className="text-sm font-medium">
              {t('delayLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="widget_proactive_delay"
                type="number"
                min={1}
                max={3600}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                disabled={!enabled || saving}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">{t('delayUnit')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('delayHelp')}</p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!hasChanges || saving || !enabled}
              onClick={() => void handleSave()}
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
