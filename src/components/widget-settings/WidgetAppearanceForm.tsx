'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WidgetPosition = 'bottom-right' | 'bottom-left';

interface WidgetAppearanceFormProps {
  brandColor: string;
  position: WidgetPosition;
  onChange: (next: { brand_color: string; position: WidgetPosition }) => void;
  saving?: boolean;
}

const DEFAULT_COLOR = '#2A2B7D';
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Appearance is a "simple fields, fire onChange immediately" form.
 * The parent (WidgetConnection) debounces the save so rapid color slider
 * drags don't spam the API.
 */
export function WidgetAppearanceForm({
  brandColor,
  position,
  onChange,
  saving = false,
}: WidgetAppearanceFormProps) {
  const t = useTranslations('social.widget.appearance');
  const [localColor, setLocalColor] = useState(brandColor || DEFAULT_COLOR);

  // Keep local in sync if the prop changes externally (e.g. reset after save).
  const lastPropRef = useRef(brandColor);
  useEffect(() => {
    if (brandColor !== lastPropRef.current) {
      lastPropRef.current = brandColor;
      setLocalColor(brandColor || DEFAULT_COLOR);
    }
  }, [brandColor]);

  const emit = (color: string, pos: WidgetPosition) => {
    onChange({ brand_color: color, position: pos });
  };

  const handleColorInput = (value: string) => {
    setLocalColor(value);
    // Only emit if it matches the hex pattern so partially typed values
    // like `#2` don't hit the API.
    if (HEX_PATTERN.test(value)) {
      emit(value.toUpperCase(), position);
    }
  };

  const handleColorPicker = (value: string) => {
    const normalized = value.toUpperCase();
    setLocalColor(normalized);
    emit(normalized, position);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
          {saving && (
            <span className="ml-2 text-xs text-muted-foreground">{t('saving')}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand color */}
        <div className="space-y-2">
          <Label htmlFor="widget_brand_color">{t('brandColor')}</Label>
          <div className="flex items-center gap-3">
            <input
              id="widget_brand_color_picker"
              type="color"
              aria-label={t('brandColor')}
              value={HEX_PATTERN.test(localColor) ? localColor : DEFAULT_COLOR}
              onChange={(e) => handleColorPicker(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border bg-background p-1"
            />
            <Input
              id="widget_brand_color"
              type="text"
              value={localColor}
              onChange={(e) => handleColorInput(e.target.value)}
              placeholder={DEFAULT_COLOR}
              className="max-w-[160px] font-mono uppercase"
              spellCheck={false}
            />
            <div
              className="h-10 w-10 rounded-full border shadow-sm"
              style={{ backgroundColor: HEX_PATTERN.test(localColor) ? localColor : DEFAULT_COLOR }}
              aria-hidden
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('brandColorHint')}</p>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label>{t('position')}</Label>
          <div className="flex flex-wrap gap-2">
            {(['bottom-right', 'bottom-left'] as WidgetPosition[]).map((pos) => (
              <Button
                key={pos}
                type="button"
                variant={position === pos ? 'default' : 'outline'}
                size="sm"
                onClick={() => emit(localColor, pos)}
                className={cn('min-w-[140px] justify-center')}
              >
                {t(pos === 'bottom-right' ? 'bottomRight' : 'bottomLeft')}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('positionHint')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
