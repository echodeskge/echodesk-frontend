import { ImageResponse } from 'next/og';

/**
 * Next.js file-convention OG image for the root (echodesk.ge/).
 *
 * Generated ONCE at build time — `next build` runs this function, writes
 * the PNG into the static output, and auto-injects the matching
 * `<meta property="og:image">` into every page that inherits the root
 * layout. Zero runtime memory cost (DO's basic-xxs 512MB can't handle
 * request-time satori rendering safely).
 *
 * Per-page images: drop a sibling `opengraph-image.tsx` into any route
 * folder — Next.js uses the nearest one.
 */
export const alt = 'EchoDesk — CRM billed in GEL, Georgian-hosted';
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

/**
 * Fetch a TTF font from jsDelivr's fontsource mirror. Satori only accepts
 * uncompressed OpenType / TrueType — Google Fonts CSS serves woff2 which
 * Satori rejects with "Unsupported OpenType signature wOF2".
 */
async function loadFontTTF(slug: string, subset: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/${subset}-${weight}-normal.ttf`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch ${url} → ${res.status}`);
  return res.arrayBuffer();
}

export default async function OpenGraphImage() {
  const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge';
  const title = 'Run your business from one place';
  const subtitle =
    'Social · calls · email · tickets · invoices · bookings · leave management';
  const tag = 'All-in-one';
  const footerLeft = domain;
  const footerRight = 'Built for Georgian teams · billed in GEL';
  const [interBold, interReg] = await Promise.all([
    loadFontTTF('inter', 'latin', 700),
    loadFontTTF('inter', 'latin', 500),
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
          fontFamily: 'Inter',
        }}
      >
        {/* Top row: wordmark + tag pill */}
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
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 1020,
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              color: BRAND.mutedViolet,
              lineHeight: 1.35,
              maxWidth: 1020,
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Footer: domain + GEL wedge */}
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
            {footerLeft}
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
            <span>{footerRight}</span>
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
    }
  );
}
