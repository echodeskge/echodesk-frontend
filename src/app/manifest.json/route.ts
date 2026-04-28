import { headers } from 'next/headers';

/**
 * Dynamic per-tenant PWA manifest.
 *
 * The PWA install dialog shows the `name` field as the app title
 * ("Tenant - EchoDesk"), so it has to be tenant-aware. Middleware
 * skips paths that contain a `.` (so the `x-tenant-subdomain`
 * header it normally injects isn't set here), so we resolve the
 * tenant from the raw `host` header using the same rules as
 * `middleware.ts::detectTenantSubdomain`.
 *
 * Served at `/manifest.json` to keep parity with the URL referenced
 * from `layout.tsx`'s metadata and from any already-installed PWAs
 * whose cached manifest URL points here. Returning a route handler
 * (instead of using `app/manifest.ts`) preserves that exact URL.
 */

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin']);
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';

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

export const dynamic = 'force-dynamic';

export async function GET() {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get('host') || '';
  const subdomain = detectTenantSubdomain(hostname);

  const tenantName = subdomain ? capitalize(subdomain) : null;
  const name = tenantName ? `${tenantName} - EchoDesk` : 'EchoDesk';
  const shortName = tenantName ?? 'EchoDesk';

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
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-192', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/pwa-icon-512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
