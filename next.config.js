/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.immobilienscout24.de' },
      { protocol: 'https', hostname: '**.immowelt.de' },
      { protocol: 'https', hostname: '**.immowelt.org' },
      { protocol: 'https', hostname: '**.ebayimg.com' },
      { protocol: 'https', hostname: '**.kleinanzeigen.de' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'pictures.immobilienscout24.de' },
    ],
  },
};

module.exports = nextConfig;
