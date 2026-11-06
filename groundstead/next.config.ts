import type { NextConfig } from 'next';

// Static export: every page is prebuilt HTML so the emergency content can be cached offline
// and served from any static host. No server runtime, no image optimizer.
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // npm scripts run from the package root; pin it so a parent repo's lockfile is not picked up.
  turbopack: { root: process.cwd() },
};

export default config;
