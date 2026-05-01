import { headers } from 'next/headers';

/**
 * Dynamic per-tenant PWA manifest.
 *
 * Each tenant subdomain (e.g. amanati.echodesk.ge) gets its own
 * install title and home-screen icon: the tenant's display name and
 * uploaded logo, fetched from the backend `tenant-settings/public-
 * branding/` endpoint at request time.
 *
 * Middleware skips paths containing a `.` (so the
 * `x-tenant-subdomain` header it normally injects isn't set here);
 * we resolve the tenant from the raw `host` header instead and call
 * the per-tenant API URL the same way `axios.ts` does on the client.
 *
 * Served at `/manifest.json` to keep the URL stable for any already-
 * installed PWAs that point here. Falls back to the default EchoDesk
 * branding (and the generic green "E" icons at /pwa-icon-192 and
 * /pwa-icon-512) if branding fetch fails or no tenant logo is set.
 */

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin']);
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
const API_DOMAIN = process.env.NEXT_PUBLIC_API_DOMAIN || 'api.echodesk.ge';

function detectTenantSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
    return null;
  }
  if (!host.endsWith(`.${MAIN_DOMAIN}`)) return null;
  const subdomain = host.slice(0, host.length - MAIN_DOMAIN.length - 1);
  if (!subdomain || subdomain.includes('.')) return null;
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface PublicBranding {
  logo: string | null;
  company_name: string;
  schema_name: string;
}

async function fetchTenantBranding(subdomain: string): Promise<PublicBranding | null> {
  const url = `https://${subdomain}.${API_DOMAIN}/api/tenant-settings/public-branding/`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Cache per-tenant for 5 min on the edge — branding rarely changes,
      // and we'd rather serve a slightly stale icon than block the install
      // dialog on a slow API roundtrip.
      next: { revalidate: 300, tags: [`tenant-branding-${subdomain}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBranding;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get('host') || '';
  const subdomain = detectTenantSubdomain(hostname);

  let displayName: string | null = null;
  let logoUrl: string | null = null;

  if (subdomain) {
    const branding = await fetchTenantBranding(subdomain);
    if (branding) {
      displayName = branding.company_name || capitalize(subdomain);
      logoUrl = branding.logo;
    } else {
      // Backend unreachable — derive a name from the subdomain so the
      // install dialog still reads as the tenant, not generic EchoDesk.
      displayName = capitalize(subdomain);
    }
  }

  const name = displayName ? `${displayName} - EchoDesk` : 'EchoDesk';
  const shortName = displayName ?? 'EchoDesk';

  // Tenant logo (when uploaded) drives the install icon. We don't know
  // the dimensions of an arbitrary uploaded image, so we declare it with
  // `sizes: "any"` and `purpose: "any"` (no maskable — uploads can have
  // their own backgrounds and we'd rather show the logo as-is than risk
  // the OS cropping into important detail). Fallback EchoDesk icons stay
  // in the array so OSes that demand a fixed size still find one.
  const icons: Array<{ src: string; sizes: string; type: string; purpose: string }> = [];
  if (logoUrl) {
    icons.push({ src: logoUrl, sizes: 'any', type: 'image/png', purpose: 'any' });
  }
  icons.push(
    { src: '/icon', sizes: '32x32', type: 'image/png', purpose: 'any' },
    { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/pwa-icon-192', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/pwa-icon-512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  );

  const manifest = {
    name,
    short_name: shortName,
    description:
      'All-in-one CRM for Georgian teams: WhatsApp, Messenger, Instagram, email, SIP calls, tickets, invoices, bookings, and leave management.',
    start_url: '/?utm_source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#0d0e3a',
    theme_color: '#2A2B7D',
    orientation: 'portrait-primary',
    lang: 'ka',
    dir: 'ltr',
    categories: ['business', 'productivity', 'communication'],
    icons,
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Browsers re-fetch the manifest periodically; 5-minute edge cache
      // keeps the per-tenant fetch fanout low without staling the title
      // for too long if the tenant renames themselves.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
