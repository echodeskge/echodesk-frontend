import { NextResponse } from 'next/server';

/**
 * Server-side route for clearing NextAuth session cookie on logout.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

  // Clear the session cookie
  response.cookies.delete(cookieName);

  return response;
}
