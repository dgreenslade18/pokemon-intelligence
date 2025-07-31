/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // Build optimizations
  output: 'standalone',
  outputFileTracing: true,
  
  // Webpack configuration for browser automation packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle browser-specific APIs during build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      }
      
      // External packages for server-side rendering
      config.externals = config.externals || []
      config.externals.push({
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
        'puppeteer-core': 'commonjs puppeteer-core',
      })
    }
    return config
  },

  // Experimental optimizations for faster builds
  experimental: {
    // External packages for serverless functions (required for Puppeteer on Vercel)
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    // Enable turbo for faster builds
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
    // Enable faster bundling
    optimizePackageImports: ['motion', 'clsx'],
    // Reduce memory usage during builds
    workerThreads: false,
    // Enable parallel processing
    cpus: 1,
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
  
  // Prevent caching of large API responses
  async headers() {
    return [
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  
  // Reduce bundle size
  modularizeImports: {
    'motion': {
      transform: 'motion/{{member}}',
    },
  },
}

module.exports = nextConfig 