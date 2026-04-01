/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,    // TODO: remove once TS errors are fixed
  },
  eslint: {
    ignoreDuringBuilds: true,   // TODO: remove once lint errors are fixed
  },
};

module.exports = nextConfig;
