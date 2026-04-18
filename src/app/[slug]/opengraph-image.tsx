import { ImageResponse } from 'next/og';
import { fetchLandingPageServer } from '@/hooks/useLandingPages';

/**
 * Per-slug OG card for feature landing pages. Built once per deploy —
 * Next.js calls this for each slug returned by generateStaticParams and
 * writes a 1200x630 PNG into the static output.
 *
 * OG images default to Georgian copy since ka is our primary market.
 */

export const alt = 'EchoDesk landing page';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRAND = {
  deepPurple: '#2A2B7D',
  darkPurple: '#181943',
  night: '#0d0e3a',
  green: '#2fb282',
  mutedViolet: '#b4b5e6',
  dimViolet: '#6f70a8',
};

async function loadFontTTF(slug: string, subset: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/${subset}-${weight}-normal.ttf`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch ${url} → ${res.status}`);
  return res.arrayBuffer();
}

// No generateStaticParams — OG images render on first request and
// get cached by the CDN. Mirrors the blog pattern.

export default async function FeatureLandingOGImage({
  params,
}: {
  params: { slug: string };
}) {
  const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';

  let title = 'EchoDesk';
  let tag = 'FEATURE';
  try {
    const page = await fetchLandingPageServer(params.slug, 'ka');
    if (page?.title) title = page.title;
    if (page?.og_tag) tag = page.og_tag.toUpperCase();
  } catch {
    // Fallback stays — we still ship a card.
  }

  const [interBold, interReg] = await Promise.all([
    loadFontTTF('inter', 'latin', 700),
    loadFontTTF('inter', 'latin', 500),
  ]);

  const titleFontSize = title.length > 80 ? 52 : title.length > 50 ? 64 : 78;

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
          fontFamily: 'Inter',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: BRAND.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: 'white',
            }}>
              E
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.01em' }}>
              EchoDesk
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '10px 22px', borderRadius: 999,
            background: 'rgba(47, 178, 130, 0.15)',
            border: `1px solid ${BRAND.green}`,
            color: BRAND.green,
            fontSize: 20, fontWeight: 700, letterSpacing: '0.08em',
          }}>
            {tag}
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: titleFontSize, fontWeight: 700, lineHeight: 1.1,
            letterSpacing: '-0.02em', maxWidth: 1040, display: 'flex',
          }}>
            {title}
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
        }}>
          <div style={{
            fontSize: 24, fontWeight: 500, color: BRAND.dimViolet, display: 'flex',
          }}>
            {domain}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: BRAND.green,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>₾</span>
            <span>Built for Georgian teams</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
        { name: 'Inter', data: interReg, weight: 500, style: 'normal' },
      ],
    },
  );
}
