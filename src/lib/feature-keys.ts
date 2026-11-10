/**
 * `feature_keys` arrives either as a JSON string (legacy `AuthUser`) or as an
 * array (generated `User`). Anything unparsable or of another shape is `[]`
 * so a bad value can never crash a layout.
 *
 * Dependency-free on purpose: components that must not pull in the
 * subscription / auth contexts (and their axios instance) import it from
 * here; `@/lib/calling-access` re-exports it.
 */
export function parseFeatureKeys(raw: unknown): string[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((key): key is string => typeof key === 'string');
}
