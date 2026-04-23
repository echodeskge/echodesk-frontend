import type { Metadata } from 'next';
import '../../globals.css';
import './widget.css';

/**
 * Widget embed layout.
 *
 * This route renders INSIDE a cross-origin iframe on tenant websites, so
 * we deliberately keep everything here minimal:
 *   - no next-intl client provider
 *   - no AuthProvider / TenantProvider / SubscriptionProvider
 *   - no Sentry / Clarity / CookieConsent / GA
 *   - no Toaster (widget has its own inline error strip)
 *
 * The root layout (src/app/layout.tsx) detects /widget/embed via the
 * x-pathname header and returns children directly, which is what lets
 * this route declare its own <html>/<body> without React complaining.
 */
export const metadata: Metadata = {
  title: 'EchoDesk chat',
  description: 'Live chat widget',
  robots: { index: false, follow: false },
};

export default function WidgetEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="color-scheme" content="light" />
      </head>
      <body className="echodesk-widget-body">{children}</body>
    </html>
  );
}
