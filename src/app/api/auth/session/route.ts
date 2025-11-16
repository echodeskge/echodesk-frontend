import { NextRequest, NextResponse } from 'next/server';
import { decode } from '@auth/core/jwt';

/**
 * Server-side route for getting the current session from JWT cookie.
 * This allows instant session hydration without waiting for API calls.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ user: null });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    const sessionToken = request.cookies.get(cookieName)?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // Decode the JWT token
    const token = await decode({
      token: sessionToken,
      secret,
      salt: 'authjs.session-token',
    });

    if (!token || !token.sub || !token.email) {
      return NextResponse.json({ user: null });
    }

    // Check if token is expired
    if (token.exp && token.exp < Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ user: null });
    }

    // Return the user data from the token
    const user = {
      id: parseInt(token.sub, 10),
      email: token.email as string,
      first_name: (token.first_name as string) || '',
      last_name: (token.last_name as string) || '',
      is_staff: (token.is_staff as boolean) || false,
      is_active: (token.is_active as boolean) || false,
      date_joined: (token.date_joined as string) || '',
    };

    const djangoToken = token.djangoToken as string;

    return NextResponse.json({ user, token: djangoToken });
  } catch (error) {
    console.error('[Auth Session] Error:', error);
    return NextResponse.json({ user: null });
  }
}
