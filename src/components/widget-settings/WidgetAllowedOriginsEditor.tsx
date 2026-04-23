'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Globe, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showEmptyWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('emptyWarning')}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {draft.map((origin, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={origin}
                onChange={(e) => handleChange(index, e.target.value)}
                onBlur={() => handleBlur(index)}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                aria-label={t('remove')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('add')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
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
