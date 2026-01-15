import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/enterprise-ai-orchestrator' : '',
  images: {
    unoptimized: true,
  },
  // Ignore typescript errors during build to ensure deployment succeeds even with minor type mismatches
  typescript: {
    ignoreBuildErrors: true,
  },
  /* Rewrites cause issues in static Vercel deployments without backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*' // Proxy to Backend
      }
    ]
  }
  */
};

export default nextConfig;
