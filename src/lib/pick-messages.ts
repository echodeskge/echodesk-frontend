/**
 * Global namespaces included in every page via the root layout.
 * Route-specific layouts must include these because nested NextIntlClientProvider
 * replaces (not merges) the parent's messages.
 */
export const GLOBAL_NAMESPACES = [
  'common',
  'nav',
  'tickets',
  'labels',
  'bugReport',
  'notificationList',
  'notificationPreferences',
  'notifications',
  // Stale assigned-chats reminder popup — mounted globally in the tenant
  // layout (like notifications), so its strings must ship on every route.
  'staleReminder',
  'notFound',
  'subscription',
  // FeatureGate / LimitGate (components/subscription) render on any route.
  'featureGate',
  'calls',
  'cookie',
  'footer',
  // Marketing blocks rendered inside the shared <Footer/>: newsletter
  // signup form + the testimonials strip used by landing pages.
  'newsletter',
  'testimonials',
  // "Finish setup" chip + first-login gate (app/(tenant)/onboarding/_components)
  // mount in the tenant header on every route.
  'onboarding',
];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Picks specific namespaces from the messages object.
 * Used to split messages per-route so each page only ships the translations it needs.
 *
 * A namespace is normally top-level (`'settings'`). A dotted path
 * (`'landing.pricing.stepper'`) picks just that sub-tree, nested under its
 * parents, for a shared component whose strings live in another route's
 * namespace — without shipping the whole parent bundle. A top-level pick of
 * the same parent always wins over a sub-tree pick.
 */
export function pickMessages(
  messages: Record<string, unknown>,
  namespaces: string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  const whole = new Set<string>();
  for (const ns of namespaces) {
    if (!ns.includes('.')) {
      if (ns in messages) {
        picked[ns] = messages[ns];
        whole.add(ns);
      }
      continue;
    }
    const path = ns.split('.');
    if (whole.has(path[0])) continue;
    // Resolve the sub-tree in the source.
    let src: unknown = messages;
    for (const key of path) {
      if (!isRecord(src) || !(key in src)) {
        src = undefined;
        break;
      }
      src = src[key];
    }
    if (src === undefined) continue;
    // Write it under the same path in the result, cloning parents we create.
    let dst = picked;
    for (const key of path.slice(0, -1)) {
      const existing = dst[key];
      const next: Record<string, unknown> = isRecord(existing) ? existing : {};
      dst[key] = next;
      dst = next;
    }
    dst[path[path.length - 1]] = src;
  }
  return picked;
}

/**
 * Picks global namespaces plus route-specific namespaces.
 * Use this in route-specific layouts to ensure global translations remain available.
 */
export function pickRouteMessages(
  messages: Record<string, unknown>,
  routeNamespaces: string[]
): Record<string, unknown> {
  return pickMessages(messages, [...GLOBAL_NAMESPACES, ...routeNamespaces]);
}
