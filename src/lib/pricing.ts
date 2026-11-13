import type { Feature } from '@/types/package';
import {
  DEFAULT_MODULE_KEYS,
  HIDDEN_ZERO_PRICE_KEYS,
  MODULE_CATALOG,
  WORKSPACE_KEYS,
} from '@/data/module-catalog';
import { EVERYTHING_SLUG, PACKS, isPackSlug, type PackSlug } from '@/data/packs';

/**
 * Pure pricing helpers shared by the landing section and the signup flow.
 * Everything is per employee (= one login), per 30-day cycle, in GEL:
 *   monthly = (workspace + Σ selected module prices) × employees
 * The employee count is any whole number from 1 — no packs, no upper cap,
 * no discounts (decisions D2/D3 as revised 2026-11-13). It is chosen at
 * signup and changeable at any time from Settings → Subscription.
 */

export const MIN_EMPLOYEES = 1;
export const EMPLOYEE_STEP = 1;

export type PriceMap = ReadonlyMap<string, number>;

/** Whole number ≥ 1: 0 → 1, 2.6 → 3, NaN / undefined → 1. No upper limit. */
export function clampEmployees(value: number): number {
  return Math.max(MIN_EMPLOYEES, Math.round(Number(value) || MIN_EMPLOYEES));
}

export function priceOf(feature: Pick<Feature, 'price_per_user_gel'>): number {
  const n = parseFloat(feature.price_per_user_gel || '0');
  return Number.isFinite(n) ? n : 0;
}

export function priceByKey(features: readonly Feature[]): PriceMap {
  return new Map(features.map((f) => [f.key, priceOf(f)]));
}

/** Sellable modules: everything the API returns minus workspace + hidden stubs. */
export function visibleModules(features: readonly Feature[]): Feature[] {
  const order = (f: Feature) => MODULE_CATALOG[f.key]?.order ?? 100 + (f.sort_order ?? 0);
  return features
    .filter((f) => f.is_active !== false)
    .filter((f) => !WORKSPACE_KEYS.includes(f.key) && !HIDDEN_ZERO_PRICE_KEYS.includes(f.key))
    .sort((a, b) => order(a) - order(b));
}

export function visibleModuleKeys(features: readonly Feature[]): string[] {
  return visibleModules(features).map((f) => f.key);
}

/** Workspace price per employee (user_management 1 ₾ + settings 0 + analytics 0). */
export function workspacePrice(prices: PriceMap): number {
  return WORKSPACE_KEYS.reduce((sum, k) => sum + (prices.get(k) ?? 0), 0);
}

/** Σ module prices per employee (workspace excluded). */
export function modulesPrice(moduleKeys: readonly string[], prices: PriceMap): number {
  return moduleKeys.reduce((sum, k) => sum + (prices.get(k) ?? 0), 0);
}

/** Per-employee price of a plan = workspace + modules. */
export function perEmployeePrice(moduleKeys: readonly string[], prices: PriceMap): number {
  return workspacePrice(prices) + modulesPrice(moduleKeys, prices);
}

export function monthlyTotal(
  moduleKeys: readonly string[],
  prices: PriceMap,
  employees: number,
): number {
  return perEmployeePrice(moduleKeys, prices) * employees;
}

/**
 * Monthly total of an existing subscription: Σ price of *every* selected
 * feature key (workspace keys included, since the API lists them) × seats.
 * Used by Settings → Subscription to preview a new employee count.
 */
export function subscriptionMonthlyTotal(
  selectedKeys: readonly string[],
  prices: PriceMap,
  employees: number,
): number {
  return modulesPrice(selectedKeys, prices) * clampEmployees(employees);
}

/** Module keys of a pack; "everything" = every sellable module the API returns. */
export function packModuleKeys(slug: PackSlug, features: readonly Feature[]): string[] {
  if (slug === EVERYTHING_SLUG) return visibleModuleKeys(features);
  const pack = PACKS.find((p) => p.slug === slug);
  if (!pack) return [];
  const available = new Set(features.map((f) => f.key));
  return pack.keys.filter((k) => available.has(k));
}

export function packPerEmployee(slug: PackSlug, features: readonly Feature[]): number {
  return perEmployeePrice(packModuleKeys(slug, features), priceByKey(features));
}

/** The pack whose module set equals `moduleKeys` exactly, if any. */
export function matchPack(moduleKeys: readonly string[], features: readonly Feature[]): PackSlug | null {
  const wanted = new Set(moduleKeys);
  for (const slug of [...PACKS.map((p) => p.slug), EVERYTHING_SLUG]) {
    const keys = packModuleKeys(slug, features);
    if (keys.length === wanted.size && keys.every((k) => wanted.has(k))) return slug;
  }
  return null;
}

/**
 * Toggle a module in the calculator, honouring `requires`:
 * - switching on AI switches the inbox on too;
 * - switching the inbox off switches off everything that requires it.
 * Returns the new module-key list and the keys that were auto-enabled.
 */
export function toggleModule(
  selected: readonly string[],
  key: string,
): { keys: string[]; autoEnabled: string[] } {
  const set = new Set(selected);
  const autoEnabled: string[] = [];
  if (set.has(key)) {
    set.delete(key);
    for (const [other, meta] of Object.entries(MODULE_CATALOG)) {
      if (meta.requires?.includes(key)) set.delete(other);
    }
  } else {
    set.add(key);
    for (const req of MODULE_CATALOG[key]?.requires ?? []) {
      if (!set.has(req)) {
        set.add(req);
        autoEnabled.push(req);
      }
    }
  }
  return { keys: [...set], autoEnabled };
}

/**
 * Full key list for the registration payload: selected modules + workspace
 * keys + attached zero-price stubs, restricted to keys the API knows.
 */
export function expandSelection(moduleKeys: readonly string[], features: readonly Feature[]): string[] {
  const available = new Set(features.map((f) => f.key));
  const out = new Set<string>();
  for (const k of WORKSPACE_KEYS) if (available.has(k)) out.add(k);
  for (const k of moduleKeys) {
    if (!available.has(k)) continue;
    out.add(k);
    for (const extra of MODULE_CATALOG[k]?.attaches ?? []) if (available.has(extra)) out.add(extra);
  }
  return [...out];
}

export function keysToIds(keys: readonly string[], features: readonly Feature[]): number[] {
  const byKey = new Map(features.map((f) => [f.key, f.id]));
  return keys.map((k) => byKey.get(k)).filter((id): id is number => typeof id === 'number');
}

export function defaultModuleKeys(features: readonly Feature[]): string[] {
  const available = new Set(features.map((f) => f.key));
  return DEFAULT_MODULE_KEYS.filter((k) => available.has(k));
}

/** `/registration?pack=…&modules=k1,k2&employees=n` — keys, never ids. */
export function registrationUrl(opts: {
  pack?: PackSlug | null;
  modules: readonly string[];
  employees: number;
}): string {
  const params = new URLSearchParams();
  if (opts.pack) params.set('pack', opts.pack);
  if (opts.modules.length > 0) params.set('modules', [...opts.modules].join(','));
  params.set('employees', String(clampEmployees(opts.employees)));
  return `/registration?${params.toString()}`;
}

export interface ParsedRegistrationParams {
  pack: PackSlug | null;
  /** Module keys (workspace excluded). */
  moduleKeys: string[];
  employees: number;
  /** True when the URL carried a plan — the flow may skip the builder. */
  preselected: boolean;
}

/**
 * Reads `?pack=` / `?modules=` / `?employees=` (and the legacy `?features=<ids>&agents=`)
 * once the catalogue is known. Unknown keys / ids are dropped silently.
 */
export function parseRegistrationParams(
  params: URLSearchParams,
  features: readonly Feature[],
): ParsedRegistrationParams {
  const available = new Set(features.map((f) => f.key));
  const rawPack = params.get('pack');
  const pack = isPackSlug(rawPack) ? rawPack : null;
  let moduleKeys: string[] = [];

  if (pack) {
    moduleKeys = packModuleKeys(pack, features);
  } else if (params.get('modules')) {
    moduleKeys = (params.get('modules') || '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => available.has(k));
  } else if (params.get('features')) {
    const ids = new Set(
      (params.get('features') || '')
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n)),
    );
    moduleKeys = features.filter((f) => ids.has(f.id)).map((f) => f.key);
  }

  const hidden = new Set([...WORKSPACE_KEYS, ...HIDDEN_ZERO_PRICE_KEYS]);
  moduleKeys = moduleKeys.filter((k) => !hidden.has(k));

  const rawEmployees = params.get('employees') ?? params.get('agents');
  const employees = rawEmployees ? clampEmployees(parseInt(rawEmployees, 10)) : MIN_EMPLOYEES;

  return { pack, moduleKeys, employees, preselected: !!pack || moduleKeys.length > 0 };
}

/** "44" / "47.5" / "1 000" — whole lari without decimals, thin-space thousands. */
export function formatGel(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const [int, frac] = rounded.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac === '00' ? grouped : `${grouped}.${frac.replace(/0$/, '')}`;
}
