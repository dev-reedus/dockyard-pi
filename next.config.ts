import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode catches double-render bugs during development —
  // especially useful when learning Server vs Client component boundaries
  reactStrictMode: true,

  // Allow images served from local network hosts (e.g. Pi agent, container registries)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '*.local',
      },
    ],
  },
}

export default nextConfig
