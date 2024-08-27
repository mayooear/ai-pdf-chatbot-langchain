import { loadEnv } from './utils/server/loadEnv.js';

// Only load from .env file in development
if (process.env.NODE_ENV === 'development') {
  loadEnv();
}

const site = process.env.SITE_ID || 'default';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { dev, isServer }) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };

    if (dev && !isServer) {
      // Disable optimization in development mode
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/sudoCookie',
        destination: 'https://ask.anandalibary.org/api/sudoCookie',
      },
    ];
  },
  env: {
    SITE_ID: site,
  },
};

export default nextConfig;
