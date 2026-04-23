'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, PhoneOff, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useQueues } from '@/hooks/usePbxQueries';

export interface WidgetVoiceCallsSectionProps {
  voiceEnabled: boolean;
  voiceQueue: string;
  voiceWorkingHoursOnly: boolean;
  hasIpCallingFeature: boolean;
  saving?: boolean;
  onChange: (next: {
    voice_enabled?: boolean;
    voice_queue?: string;
    voice_working_hours_only?: boolean;
  }) => void;
}

/**
 * Settings sub-card for the widget's optional WebRTC voice-call feature.
 *
 * Hidden entirely when the tenant doesn't have the `ip_calling` subscription
 * feature — voice calls route through Asterisk, and a tenant without a PBX
 * can't fulfil them. When `ip_calling` IS present, the toggles write
 * directly to the WidgetConnection via the parent's `onChange` handler,
 * which debounces saves through the same pipeline as the other fields.
 */
export function WidgetVoiceCallsSection({
  voiceEnabled,
  voiceQueue,
  voiceWorkingHoursOnly,
  hasIpCallingFeature,
  saving = false,
  onChange,
}: WidgetVoiceCallsSectionProps) {
  const t = useTranslations('settings.social.widget.voice');

  const { data: queuesData, isLoading: queuesLoading } = useQueues();
  const queueOptions = useMemo(() => {
    const list = (queuesData as { results?: Array<{ slug: string; name: string; is_active?: boolean }> } | undefined)?.results
      ?? (queuesData as Array<{ slug: string; name: string; is_active?: boolean }> | undefined)
      ?? [];
    return list.filter((q) => q.is_active !== false);
  }, [queuesData]);

  if (!hasIpCallingFeature) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t('description')}</p>

        {/* Master toggle */}
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div className="flex items-start gap-2">
            {voiceEnabled ? (
              <Phone className="h-4 w-4 mt-0.5 text-indigo-600" />
            ) : (
              <PhoneOff className="h-4 w-4 mt-0.5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="widget_voice_enabled" className="font-medium">
                {t('enableLabel')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('enableHelp')}
              </p>
            </div>
          </div>
          <Switch
            id="widget_voice_enabled"
            checked={voiceEnabled}
            disabled={saving}
            onCheckedChange={(checked) => onChange({ voice_enabled: checked })}
            aria-label={t('enableLabel')}
          />
        </div>

        {/* Queue picker — greyed out when voice disabled */}
        <div className={voiceEnabled ? '' : 'opacity-60 pointer-events-none'}>
          <Label htmlFor="widget_voice_queue" className="text-sm font-medium">
            {t('queueLabel')}
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            {t('queueHelp')}
          </p>
          {queuesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : queueOptions.length === 0 ? (
            <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {t('noQueuesWarning')}
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={voiceQueue || queueOptions[0]?.slug || ''}
              onValueChange={(value) => onChange({ voice_queue: value })}
              disabled={!voiceEnabled || saving}
            >
              <SelectTrigger id="widget_voice_queue">
                <SelectValue placeholder={t('queuePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {queueOptions.map((q) => (
                  <SelectItem key={q.slug} value={q.slug}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Business-hours gate */}
        <div
          className={
            'flex items-center justify-between gap-4 rounded-md border p-3 ' +
            (voiceEnabled ? '' : 'opacity-60 pointer-events-none')
          }
        >
          <div>
            <Label htmlFor="widget_voice_hours" className="font-medium">
              {t('hoursLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('hoursHelp')}
            </p>
          </div>
          <Switch
            id="widget_voice_hours"
            checked={voiceWorkingHoursOnly}
            disabled={!voiceEnabled || saving}
            onCheckedChange={(checked) =>
              onChange({ voice_working_hours_only: checked })
            }
            aria-label={t('hoursLabel')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
