import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';
// `contentType` is reserved for opengraph-image.tsx / twitter-image.tsx
// file conventions, not for generic route.tsx handlers — ImageResponse
// sets the Content-Type header itself.

// Brand palette pulled from public/logo-svg.svg
const BRAND = {
  deepPurple: '#2A2B7D',
  darkPurple: '#181943',
  night: '#0d0e3a',
  green: '#2fb282',
  mutedViolet: '#b4b5e6',
  dimViolet: '#6f70a8',
};

const SIZE = { width: 1200, height: 630 } as const;

/**
 * Fetch a Google-Font file so Satori (the engine behind ImageResponse) can
 * render the glyphs. Edge runtime has no bundled Georgian/Latin fonts, so
 * we inline woff2 bytes at request time — Vercel caches the underlying
 * fetch per deployment so cold-starts pay once.
 *
 * The `text` param tells Google Fonts to subset the file to only the
 * glyphs we actually render (keeps each font ~10-20KB).
 */
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(url, {
    headers: {
      // Make Google serve the woff2 variant (its default UA-based response
      // is fine but being explicit is safer).
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  }).then((r) => r.text());
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
  if (!match) throw new Error(`Google Font ${family} (${weight}) — no woff2 URL in CSS`);
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`Google Font ${family} fetch failed: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'EchoDesk').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 180);
  const tag = (searchParams.get('tag') || '').slice(0, 24);
  const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';

  // Subset each font to only glyphs we render — drastically smaller fetch
  // and works for Latin + Mkhedruli (Georgian) + punctuation in one shot.
  const glyphs = `EchoDesk ${domain}${title}${subtitle}${tag}₾·:—-·`;
  const [interBold, interReg, notoBold, notoReg] = await Promise.all([
    loadGoogleFont('Inter', 700, glyphs),
    loadGoogleFont('Inter', 500, glyphs),
    loadGoogleFont('Noto+Sans+Georgian', 700, glyphs),
    loadGoogleFont('Noto+Sans+Georgian', 500, glyphs),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          background: `linear-gradient(135deg, ${BRAND.deepPurple} 0%, ${BRAND.darkPurple} 55%, ${BRAND.night} 100%)`,
          color: 'white',
          fontFamily: 'Inter, NotoKa, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top row: wordmark + optional tag badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: BRAND.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                fontWeight: 700,
                color: 'white',
              }}
            >
              E
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.01em' }}>
              EchoDesk
            </div>
          </div>
          {tag && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 22px',
                borderRadius: 999,
                background: 'rgba(47, 178, 130, 0.15)',
                border: `1px solid ${BRAND.green}`,
                color: BRAND.green,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {tag}
            </div>
          )}
        </div>

        {/* Center: headline + subtitle */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? 72 : 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 1020,
              display: 'flex',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: BRAND.mutedViolet,
                lineHeight: 1.35,
                maxWidth: 1020,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Footer row: domain + GEL wedge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: BRAND.dimViolet,
              display: 'flex',
            }}
          >
            {domain}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: BRAND.green,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>₾</span>
            <span>GEL pricing · Georgian-hosted</span>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
        { name: 'Inter', data: interReg, weight: 500, style: 'normal' },
        { name: 'NotoKa', data: notoBold, weight: 700, style: 'normal' },
        { name: 'NotoKa', data: notoReg, weight: 500, style: 'normal' },
      ],
      headers: {
        'cache-control':
          'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    }
  );
}
