/**
 * Shared helper for detecting a tenant subdomain from the incoming
 * `host` header. Marketing routes (`/`, `/blog`, the landing pages,
 * etc.) must render a 404 when hit via a tenant subdomain — the tenant
 * app lives at `<subdomain>.echodesk.ge` and serves a login form, not
 * the marketing site.
 */

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin']);

export function extractTenantSubdomainFromHost(
  host: string | null,
  mainDomain: string,
): string | null {
  if (!host) return null;
  const clean = host.split(':')[0];
  if (clean === 'localhost' || clean.endsWith('.localhost') || clean === '127.0.0.1') return null;
  if (!clean.endsWith(`.${mainDomain}`)) return null;
  const sub = clean.slice(0, clean.length - mainDomain.length - 1);
  if (!sub || sub.includes('.')) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

/**
 * Convenience wrapper that uses the runtime env var for the main domain.
 * Pass the result of `headers()` to this helper.
 */
export function getTenantSubdomainFromHeaders(h: Headers): string | null {
  const hintFromMiddleware = h.get('x-tenant-subdomain');
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const hostHeader = h.get('host');
  return hintFromMiddleware || extractTenantSubdomainFromHost(hostHeader, mainDomain);
}
