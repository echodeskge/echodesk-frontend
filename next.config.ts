import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DigitalOcean App Platform optimization
  output: 'standalone',
  
  // Disable React Strict Mode for better drag and drop performance
  reactStrictMode: false,
  
  async headers() {
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
        // Security headers for all pages
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
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

  // Configure domains for image optimization
  images: {
    domains: [
      'echodesk.ge',
      'api.echodesk.ge',
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
    ],
  },

  // Performance optimizations for DigitalOcean
  compress: true,
  poweredByHeader: false,
  
  // Enable TypeScript and ESLint checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Environment-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    swcMinify: true,
    // Keep console logs for debugging on DigitalOcean
    compiler: {
      removeConsole: false,
    },
  }),
};

export default nextConfig;
