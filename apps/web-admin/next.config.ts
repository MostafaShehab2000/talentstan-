import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.211.85'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
