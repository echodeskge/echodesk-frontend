'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Info } from 'lucide-react';
import { ActionButton, SettingsSection } from '@/components/redesign/settings';
import { toast } from 'sonner';

interface WidgetInstallCardProps {
  widgetToken: string;
}

/**
 * Shows the `<script>` tag the tenant pastes into their site, with a copy
 * button. The widget bootstrap is hosted on the main `echodesk.ge` domain
 * (not the tenant subdomain) because it has to be embeddable from any origin.
 */
export function WidgetInstallCard({ widgetToken }: WidgetInstallCardProps) {
  const t = useTranslations('social.widget.install');
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    const host =
      process.env.NEXT_PUBLIC_WIDGET_HOST ||
      process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
      'echodesk.ge';
    const base = host.startsWith('http') ? host : `https://${host}`;
    return `<script async src="${base}/widget.js?t=${widgetToken}"></script>`;
  }, [widgetToken]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <SettingsSection
      title={t('title')}
      hint={t('description')}
      testId="widget-install"
      actions={
        <ActionButton icon={copied ? Check : Copy} onClick={handleCopy} aria-label={t('copy')} testId="widget-copy-snippet">
          {t('copy')}
        </ActionButton>
      }
    >
      <div className="flex flex-col gap-2 px-4 py-3.5">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/50 px-3 py-2.5 font-mono text-xs">
          <code>{snippet}</code>
        </pre>
        <p className="flex items-start gap-1.5 text-xs leading-[17px] text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('helperText')}
        </p>
      </div>
    </SettingsSection>
  );
}
