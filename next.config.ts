import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
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
