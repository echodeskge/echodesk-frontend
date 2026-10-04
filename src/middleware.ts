import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin', 'book']);

// The public booking site lives on its own host (book.echodesk.ge/<salon>)
// and is served from the internal /book-site route tree.
const BOOKING_SUBDOMAIN = 'book';
const BOOKING_ROUTE_PREFIX = '/book-site';

function isBookingHost(hostname: string, mainDomain: string): boolean {
  const host = hostname.split(':')[0];
  return host === `${BOOKING_SUBDOMAIN}.${mainDomain}` || host === `${BOOKING_SUBDOMAIN}.localhost`;
}

// Next's file-based metadata routes: they exist at the app root, so on the
// booking host they must not be mistaken for a salon called "icon".
const ROOT_METADATA_ROUTES = /^\/(icon|apple-icon|opengraph-image|twitter-image|pwa-icon-\d+)(\/|$)/;

function detectTenantSubdomain(hostname: string, mainDomain: string): string | null {
  // Strip port and normalize
  const host = hostname.split(':')[0];
  // localhost stays untouched — dev mode uses localStorage to pick tenant
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
    return null;
  }
  if (!host.endsWith(`.${mainDomain}`)) return null;
  const subdomain = host.slice(0, host.length - mainDomain.length - 1);
  if (!subdomain || subdomain.includes('.')) return null; // Only single-level subdomains
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes and static files (not for pages)
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (isBookingHost(hostname, mainDomain)) {
    if (ROOT_METADATA_ROUTES.test(pathname)) {
      return NextResponse.next();
    }

    // One public URL per page: book.echodesk.ge/<salon>, never the internal
    // /book-site/<salon> form.
    if (pathname === BOOKING_ROUTE_PREFIX || pathname.startsWith(`${BOOKING_ROUTE_PREFIX}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(BOOKING_ROUTE_PREFIX.length) || '/';
      return NextResponse.redirect(url, 308);
    }

    // Salon names are lowercase; a link typed or auto-capitalised as
    // /Nitchiani should still work.
    const [, salonSegment = '', ...restSegments] = pathname.split('/');
    if (salonSegment && salonSegment !== salonSegment.toLowerCase()) {
      const url = request.nextUrl.clone();
      url.pathname = ['', salonSegment.toLowerCase(), ...restSegments].join('/');
      return NextResponse.redirect(url, 308);
    }

    // book.echodesk.ge/<salon>/… → /book-site/<salon>/…  (URL in the browser
    // stays as typed). x-pathname carries the internal path so the root
    // layout can skip the dashboard providers for this tree.
    const internalPath = `${BOOKING_ROUTE_PREFIX}${pathname === '/' ? '' : pathname}`;
    const bookingHeaders = new Headers(request.headers);
    bookingHeaders.set('x-pathname', internalPath);
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    return NextResponse.rewrite(url, { request: { headers: bookingHeaders } });
  }

  // The booking route tree is only reachable through the booking host.
  if (pathname === BOOKING_ROUTE_PREFIX || pathname.startsWith(`${BOOKING_ROUTE_PREFIX}/`)) {
    return new NextResponse(null, { status: 404 });
  }

  const subdomain = detectTenantSubdomain(hostname, mainDomain);

  // Forward the pathname on every request so the root layout can detect
  // routes that need to bypass heavy providers (e.g. /widget/embed, which
  // runs inside a cross-origin iframe and must be minimal).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  if (subdomain) {
    // Forward the tenant hint via REQUEST headers so Server Components
    // (app/page.tsx, layouts) can read it with `headers()` and render the
    // tenant-aware UI on the very first byte — no flash of the main
    // echodesk.ge landing page before client hydration.
    requestHeaders.set('x-tenant-subdomain', subdomain);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};
