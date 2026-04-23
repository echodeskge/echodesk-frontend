'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WidgetPreviewFrameProps {
  widgetToken: string | null | undefined;
}

/**
 * Iframe preview of the widget as visitors see it. We intentionally show a
 * scaled-down frame (380 x 600, scaled to 280 x 440) to fit next to the
 * editor on wider screens.
 *
 * When no token is available yet (e.g. the connection is being created) a
 * greyed-out placeholder is shown.
 *
 * The preview uses `preview=1` in the URL so the embed page can skip any
 * origin-validation gating and render in "setup mode" regardless of the
 * configured `allowed_origins`.
 */
export function WidgetPreviewFrame({ widgetToken }: WidgetPreviewFrameProps) {
  const t = useTranslations('social.widget.preview');

  const previewUrl = useMemo(() => {
    if (!widgetToken) return null;
    const host =
      process.env.NEXT_PUBLIC_WIDGET_HOST ||
      process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
      'echodesk.ge';
    const base = host.startsWith('http') ? host : `https://${host}`;
    return `${base}/widget/embed/?t=${encodeURIComponent(widgetToken)}&preview=1`;
  }, [widgetToken]);

  // Natural iframe box: 380×600. Display it at 280×440.
  const naturalWidth = 380;
  const naturalHeight = 600;
  const displayWidth = 280;
  const displayHeight = 440;
  const scale = displayWidth / naturalWidth;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="mx-auto overflow-hidden rounded-xl border bg-muted/30"
          style={{ width: displayWidth, height: displayHeight }}
        >
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title={t('title')}
              aria-label={t('title')}
              className="block border-0 bg-background"
              style={{
                width: naturalWidth,
                height: naturalHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
              {t('noToken')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
