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
  'notifications',
  'notFound',
  'subscription',
  'calls',
];

/**
 * Picks specific top-level namespaces from the messages object.
 * Used to split messages per-route so each page only ships the translations it needs.
 */
export function pickMessages(
  messages: Record<string, unknown>,
  namespaces: string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const ns of namespaces) {
    if (ns in messages) {
      picked[ns] = messages[ns];
    }
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
