import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content Security Policy — emitted in **Report-Only** mode for now so we
 * can observe violations before enforcement. Edit entries in the array
 * below rather than the joined string.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clarity.ms https://www.googletagmanager.com https://www.google-analytics.com https://*.sentry.io https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.echodesk.ge https://*.clarity.ms https://*.google-analytics.com https://*.googletagmanager.com https://*.sentry.io https://*.ingest.sentry.io https://*.anthropic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  // DigitalOcean App Platform optimization
  output: 'standalone',

  // Disable React Strict Mode for better drag and drop performance
  reactStrictMode: false,

  async headers() {
    const securityHeaders: { key: string; value: string }[] = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
      },
      { key: 'Content-Security-Policy-Report-Only', value: CSP_DIRECTIVES },
    ];

    // Only ship HSTS in production — otherwise localhost pins itself to HTTPS.
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        // Apply CORS headers for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Tenant-Subdomain' },
        ],
      },
      {
        // Immutable cache for hashed static assets (JS, CSS, media)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache optimized images for 1 hour, serve stale while revalidating
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Cache font files for 1 year (they're content-hashed by next/font)
        source: '/_next/static/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Security headers for all pages
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  
  async rewrites() {
    return [
      // Proxy API requests to Django backend during development
      {
        source: '/api/backend/:path*',
        destination: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_API_URL
          ? `${process.env.NEXT_PUBLIC_DEV_API_URL}/:path*`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
    ];
  },

  // Enable ETags for conditional requests (304 Not Modified)
  generateEtags: true,

  // Configure domains for image optimization
  images: {
    minimumCacheTTL: 3600,
    domains: [
      'echodesk.ge',
      'api.echodesk.ge',
      'echodesk.cloud',
      'api.echodesk.cloud',
      'localhost',
    ],
    // Allow wildcard subdomains for DigitalOcean and social media platforms
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.echodesk.ge',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.api.echodesk.ge',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.echodesk.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.api.echodesk.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ondigitalocean.app',
        port: '',
        pathname: '/**',
      },
      // Facebook CDN domains for Messenger/Instagram attachments
      {
        protocol: 'https',
        hostname: 'scontent.xx.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
        port: '',
        pathname: '/**',
      },
      // DigitalOcean Spaces (tenant logos and media)
      {
        protocol: 'https',
        hostname: 'echodesk-spaces.fra1.digitaloceanspaces.com',
        pathname: '/**',
      },
      // WhatsApp media domains
      {
        protocol: 'https',
        hostname: '*.whatsapp.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Performance optimizations for DigitalOcean
  compress: true,
  poweredByHeader: false,
  
  // Enable TypeScript checking during build, ignore ESLint warnings
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow builds to succeed with ESLint warnings (unused vars, any types)
    ignoreDuringBuilds: true,
  },

  // Environment-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "echodesk-llc",
  project: "echodesk-frontend",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Webpack-specific options (moved from deprecated top-level options)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
