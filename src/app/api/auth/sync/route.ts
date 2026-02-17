import { NextRequest, NextResponse } from 'next/server';
import { encode } from '@auth/core/jwt';

/**
 * Server-side route for syncing Django auth to NextAuth session.
 * This bypasses client-side NextAuth calls that were being routed externally.
 * Creates a JWT token directly and sets it as a cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { token, userId, email, firstName, lastName, isStaff, isActive, dateJoined } = body;

    if (!token || !userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Support both AUTH_SECRET (Auth.js v5) and NEXTAUTH_SECRET (legacy)
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'AUTH_SECRET not configured' },
        { status: 500 }
      );
    }

    // Create JWT token with user data
    const jwtToken = await encode({
      token: {
        sub: String(userId),
        email,
        djangoToken: token,
        first_name: firstName || '',
        last_name: lastName || '',
        is_staff: isStaff || false,
        is_active: isActive || false,
        date_joined: dateJoined || '',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      },
      secret,
      salt: 'authjs.session-token',
    });

    // Set the session cookie
    const response = NextResponse.json({ success: true });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    response.cookies.set(cookieName, jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[Auth Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}
