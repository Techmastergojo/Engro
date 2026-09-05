/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow processing larger uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
};

module.exports = nextConfig;
