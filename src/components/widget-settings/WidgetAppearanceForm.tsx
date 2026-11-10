'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  ChoiceControl,
  FieldRow,
  SettingsSection,
  SwatchPicker,
  settingsInputClass,
  type SwatchOption,
} from '@/components/redesign/settings';

export type WidgetPosition = 'bottom-right' | 'bottom-left';

interface WidgetAppearanceFormProps {
  brandColor: string;
  position: WidgetPosition;
  onChange: (next: { brand_color: string; position: WidgetPosition }) => void;
  saving?: boolean;
}

const DEFAULT_COLOR = '#2A2B7D';
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Quick brand colours (design swatches). Picking one is the same as picking it in the colour input. */
const SWATCHES = [
  { key: 'default', value: '#2A2B7D' },
  { key: 'blue', value: '#2563EB' },
  { key: 'green', value: '#16A34A' },
  { key: 'red', value: '#DC2626' },
  { key: 'purple', value: '#9333EA' },
  { key: 'orange', value: '#EA580C' },
] as const;

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

  const swatches: SwatchOption[] = SWATCHES.map((sw) => ({ value: sw.value, color: sw.value, label: t(`swatches.${sw.key}`) }));
  const normalizedLocal = localColor.toUpperCase();

  return (
    <SettingsSection
      title={t('title')}
      hint={
        <>
          {t('description')}
          {saving && <span className="ms-2 text-xs text-muted-foreground">{t('saving')}</span>}
        </>
      }
      testId="widget-appearance"
    >
      {/* Brand color */}
      <FieldRow label={t('brandColor')} help={t('brandColorHint')} htmlFor="widget_brand_color">
        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          <SwatchPicker
            value={swatches.some((sw) => sw.value === normalizedLocal) ? normalizedLocal : null}
            onChange={(value) => handleColorPicker(value)}
            options={swatches}
            ariaLabel={t('brandColor')}
            testId="widget-swatches"
          />
          <div className="flex items-center gap-2">
            <input
              id="widget_brand_color_picker"
              type="color"
              aria-label={t('brandColor')}
              value={HEX_PATTERN.test(localColor) ? localColor : DEFAULT_COLOR}
              onChange={(e) => handleColorPicker(e.target.value)}
              className="h-[34px] w-11 cursor-pointer rounded-md border bg-background p-1"
            />
            <input
              id="widget_brand_color"
              type="text"
              value={localColor}
              onChange={(e) => handleColorInput(e.target.value)}
              placeholder={DEFAULT_COLOR}
              className={cn(settingsInputClass, 'w-[120px] font-mono uppercase')}
              spellCheck={false}
            />
          </div>
        </div>
      </FieldRow>

      {/* Position */}
      <FieldRow label={t('position')} help={t('positionHint')} align="center">
        <ChoiceControl
          value={position}
          onChange={(pos) => emit(localColor, pos)}
          ariaLabel={t('position')}
          testId="widget-position"
          options={[
            { value: 'bottom-right', label: t('bottomRight') },
            { value: 'bottom-left', label: t('bottomLeft') },
          ]}
        />
      </FieldRow>
    </SettingsSection>
  );
}
