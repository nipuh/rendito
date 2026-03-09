/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.immobilienscout24.de' },
      { protocol: 'https', hostname: '**.immowelt.org' },
      { protocol: 'https', hostname: '**.ebayimg.com' },
    ],
  },
};

module.exports = nextConfig;
