import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode catches double-render bugs during development —
  // especially useful when learning Server vs Client component boundaries
  reactStrictMode: true,

  // Produces a minimal self-contained build under .next/standalone —
  // only the files needed to run the server are included, no node_modules bloat.
  // Required for the Docker image to work correctly.
  output: 'standalone',

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
