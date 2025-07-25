import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  
  // Skip middleware for API routes, static files, and localhost
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('.') ||
    hostname.includes('localhost')
  ) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = hostname.replace(`.${mainDomain}`, '');
  
  // If this is a subdomain (not www, api, etc.) and not the main domain
  if (
    subdomain &&
    subdomain !== hostname && // Make sure it's actually a subdomain
    !['www', 'api', 'mail', 'admin'].includes(subdomain)
  ) {
    // This is a tenant subdomain - add tenant info to headers
    const response = NextResponse.next();
    response.headers.set('x-tenant-subdomain', subdomain);
    return response;
  }

  // For main domain or unrecognized subdomains, continue normally
  return NextResponse.next();
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
