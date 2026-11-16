import type { NextConfig } from 'next';

// The app runs entirely in the browser, so it exports to plain static files
// (the `out` folder) that any static host can serve.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
