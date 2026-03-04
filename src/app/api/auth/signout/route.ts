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

  // Clear the session cookie by setting it to expire immediately
  // Must match the options used when setting the cookie
  response.cookies.set(cookieName, '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  });

  return response;
}
