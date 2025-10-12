import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { locales, type Locale } from '@/lib/i18n';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale } = body;

    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return NextResponse.json({ success: true, locale });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set locale' },
      { status: 500 }
    );
  }
}
