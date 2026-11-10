'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { rdButton } from '@/components/redesign/buttons';
import { ActionButton, SettingsNote, SettingsSection, settingsInputClass } from '@/components/redesign/settings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WidgetAllowedOriginsEditorProps {
  value: string[];
  onSave: (origins: string[]) => Promise<void> | void;
  saving?: boolean;
}

/**
 * Small editor for the `allowed_origins` list on a WidgetConnection.
 * Uses an explicit Save button (not debounced) since this is a list field
 * where accidental saves on each keystroke would be surprising.
 *
 * Validation:
 *   - Each entry must start with http:// or https://
 *   - Must be a parseable URL
 *   - Trailing slashes stripped on blur
 *   - Duplicates rejected
 */
export function WidgetAllowedOriginsEditor({
  value,
  onSave,
  saving = false,
}: WidgetAllowedOriginsEditorProps) {
  const t = useTranslations('social.widget.origins');
  const [draft, setDraft] = useState<string[]>(() =>
    value.length > 0 ? [...value] : [''],
  );

  const isDirty = JSON.stringify(draft.filter(Boolean)) !== JSON.stringify(value);

  const handleChange = (index: number, newValue: string) => {
    setDraft((prev) => prev.map((entry, i) => (i === index ? newValue : entry)));
  };

  const handleBlur = (index: number) => {
    setDraft((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        // Strip trailing slash, collapse whitespace.
        const trimmed = entry.trim().replace(/\/+$/, '');
        return trimmed;
      }),
    );
  };

  const handleAdd = () => {
    setDraft((prev) => [...prev, '']);
  };

  const handleRemove = (index: number) => {
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };

  const validateOrigin = (origin: string): string | null => {
    if (!origin) return t('errorEmpty');
    if (!/^https?:\/\//i.test(origin)) return t('errorScheme');
    try {
      // URL constructor throws on invalid input; that's our validator.
      new URL(origin);
    } catch {
      return t('errorInvalid');
    }
    return null;
  };

  const handleSave = async () => {
    const cleaned = draft
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter((o) => o.length > 0);

    // Validate every non-empty entry.
    for (const origin of cleaned) {
      const err = validateOrigin(origin);
      if (err) {
        toast.error(`${origin}: ${err}`);
        return;
      }
    }

    // Check duplicates.
    const unique = new Set(cleaned);
    if (unique.size !== cleaned.length) {
      toast.error(t('errorDuplicate'));
      return;
    }

    try {
      await onSave(cleaned);
      setDraft(cleaned.length === 0 ? [''] : cleaned);
      toast.success(t('saved'));
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || t('saveFailed'));
    }
  };

  const effectiveList = draft.filter((o) => o.trim().length > 0);
  const showEmptyWarning = effectiveList.length === 0;

  return (
    <SettingsSection title={t('title')} hint={t('description')} testId="widget-origins">
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {showEmptyWarning && (
          <SettingsNote tone="danger" icon={AlertTriangle}>{t('emptyWarning')}</SettingsNote>
        )}

        <div className="flex flex-col gap-2">
          {draft.map((origin, index) => (
            <div key={index} className="flex gap-1.5">
              <input
                type="url"
                placeholder="https://example.com"
                className={cn(settingsInputClass, 'flex-1 font-mono text-xs')}
                aria-label={t('title')}
                value={origin}
                onChange={(e) => handleChange(index, e.target.value)}
                onBlur={() => handleBlur(index)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className={rdButton.ghostIcon}
                onClick={() => handleRemove(index)}
                aria-label={t('remove')}
                title={t('remove')}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Plus} onClick={handleAdd}>
            {t('add')}
          </ActionButton>
          <button
            type="button"
            className={rdButton.primarySm}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
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
      </div>
    </SettingsSection>
  );
}
