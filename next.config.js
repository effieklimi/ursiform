/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: false,
  // Enable standalone output for Docker
  output: "standalone",
  // Environment variables available to the client
  env: {
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_HTTPS: process.env.QDRANT_HTTPS,
  },
  // Webpack configuration for server-side modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these modules on the client side
      config.externals = config.externals || [];
      config.externals.push({
        "@qdrant/js-client-rest": "@qdrant/js-client-rest",
        openai: "openai",
        "@google/generative-ai": "@google/generative-ai",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
