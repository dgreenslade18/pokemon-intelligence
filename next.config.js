/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated experimental.appDir - it's now the default
  // Remove deprecated api configuration
  
  // Clean configuration for Next.js 14
  typescript: {
    // Allow production builds to succeed even if there are type errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig 