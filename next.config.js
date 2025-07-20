/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // Build optimizations
  output: 'standalone',
  outputFileTracing: true,
  
  // Experimental optimizations for faster builds
  experimental: {
    // Enable turbo for faster builds
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
    // Enable faster bundling
    optimizePackageImports: ['motion', 'clsx'],
    // Reduce memory usage during builds
    workerThreads: false,
    // Enable parallel processing
    cpus: 1,
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  
  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && {
    experimental: {
      ...nextConfig.experimental,
    },
  }),
  
  // TypeScript/ESLint optimizations
  typescript: {
    // Allow production builds to succeed even if there are type errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: false,
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Reduce bundle size
  modularizeImports: {
    'motion': {
      transform: 'motion/{{member}}',
    },
  },
}

module.exports = nextConfig 