import { ImageResponse } from 'next/og';

/**
 * Next.js file-convention apple-touch-icon at iOS's required 180×180.
 *
 * Generated at build time, cached as a static PNG, and auto-injected as
 * <link rel="apple-touch-icon"> by Next.js. Used when an iOS user adds
 * the site to their home screen — without this, iOS falls back to a
 * blurry screenshot of the page.
 *
 * Visual matches `icon.tsx` and the OG image's brand mark (green square
 * + white "E") so home-screen tile, browser tab, and share previews
 * line up.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2fb282',
          color: 'white',
          fontSize: 124,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        E
      </div>
    ),
    size
  );
}
