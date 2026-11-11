'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Feature } from '@/types/package';

export interface ModuleCopy {
  name: string;
  /** One-line "what it does". */
  desc: string;
  /** 3–5 short bullets; empty for keys without a translation. */
  bullets: string[];
}

/**
 * Module names/descriptions by `Feature.key` through i18n
 * (`landing.pricing.modules.<key>.{name,desc,bullets}`), falling back to the
 * API's English `name` / `description` for keys without a translation.
 * Bullets are stored as one string joined with " · " so the catalogs stay
 * flat strings.
 */
export function useModuleCopy(): (feature: Pick<Feature, 'key' | 'name' | 'description'>) => ModuleCopy {
  const t = useTranslations('landing.pricing.modules');
  return useCallback(
    (feature) => {
      const k = feature.key;
      const name = t.has(`${k}.name`) ? t(`${k}.name`) : feature.name;
      const desc = t.has(`${k}.desc`) ? t(`${k}.desc`) : feature.description || '';
      const bullets = t.has(`${k}.bullets`)
        ? t(`${k}.bullets`)
            .split('·')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return { name, desc, bullets };
    },
    [t],
  );
}
