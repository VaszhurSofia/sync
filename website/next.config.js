/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sync/ui', '@sync/types'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:3002',
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  experimental: {
    skipTrailingSlashRedirect: true,
  },
};

module.exports = nextConfig;
