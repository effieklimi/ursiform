/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode for compatibility
  reactStrictMode: false,
  // Add legacy browser support
  swcMinify: false,
  // Support for pages directory
  pageExtensions: ["ts", "tsx", "js", "jsx"],
};

module.exports = nextConfig;
