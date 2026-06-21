import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@mating/ui', '@mating/shared', '@mating/config'],
  reactStrictMode: true,
};

export default nextConfig;
