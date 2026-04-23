import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'mail', 'admin']);

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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
