import { ImageResponse } from 'next/og';

/**
 * Next.js file-convention favicon at the standard 32×32 browser-tab size.
 *
 * Generated at build time → cached as a static PNG → injected as
 * <link rel="icon"> by Next.js into every page that inherits the root
 * layout. Matches the brand mark we already use in opengraph-image.tsx
 * (green square + white "E") so tab/share/PWA icons are visually
 * consistent across every surface.
 *
 * The filename is `icon.tsx` (not `favicon.ico`) so Next.js takes
 * precedence over the legacy 25KB favicon.ico in this directory and
 * serves a crisp PNG instead.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 6,
          color: 'white',
          fontSize: 22,
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
