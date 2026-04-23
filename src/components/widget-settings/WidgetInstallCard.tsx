'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, Code2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code2 className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-md border bg-muted/50 font-mono text-xs sm:text-sm">
          <pre className="overflow-x-auto p-4 pr-14 whitespace-pre-wrap break-all">
            <code>{snippet}</code>
          </pre>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute right-2 top-2 h-8 w-8 p-0"
            aria-label={t('copy')}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t('helperText')}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
