import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply CORS headers for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  
  async rewrites() {
    return [
      // Proxy API requests to Django backend during development
      {
        source: '/api/backend/:path*',
        destination: process.env.NEXT_PUBLIC_DEV_API_URL 
          ? `${process.env.NEXT_PUBLIC_DEV_API_URL}/:path*`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
    ];
  },

  // Enable experimental features for better performance
  experimental: {
    // Enable server actions and other experimental features as needed
  },

  // Configure domains for image optimization
  images: {
    domains: [
      'echodesk.ge',
      'api.echodesk.ge',
      'localhost',
    ],
    // Allow wildcard subdomains
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
    ],
  },

  // Output standalone for better deployment
  output: 'standalone',
  
  // Enable TypeScript and ESLint checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
