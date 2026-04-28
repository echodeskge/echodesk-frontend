import { ImageResponse } from 'next/og';

/**
 * 512×512 PWA app-icon. Referenced by `manifest.json` for desktop
 * install dialogs and high-DPI Android home-screens. Square,
 * edge-to-edge brand background with the "E" centered in the inner
 * ~65% of the canvas so OS-level mask crops (Android adaptive icons,
 * macOS rounded squircles, Windows tile masks) don't clip the glyph.
 */
export const dynamic = 'force-static';

export async function GET() {
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
          fontSize: 320,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        E
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
