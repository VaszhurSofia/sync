/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@sync/ui', '@sync/types'],
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:3002',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
