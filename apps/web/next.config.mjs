/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/fullstack-notes',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@fullstack-notes/ui', '@fullstack-notes/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
