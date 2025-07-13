import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Only protect specific routes, not everything
  const protectedPaths = ['/', '/api/script1', '/api/script2', '/api/script3', '/api/script4', '/api/script5', '/api/script6', '/api/script7', '/api/comp-list', '/api/autocomplete', '/api/download']
  
  if (!protectedPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  console.log('🔒 Middleware protecting:', request.nextUrl.pathname)
  
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })
  console.log('🔑 Token exists:', !!token)
  
  // If no token, redirect to sign-in
  if (!token) {
    console.log('❌ No token, redirecting to sign-in')
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  console.log('✅ Token valid, allowing access')
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only match specific protected routes
    '/',
    '/api/script1/:path*',
    '/api/script2/:path*', 
    '/api/script3/:path*',
    '/api/script4/:path*',
    '/api/script5/:path*',
    '/api/script6/:path*',
    '/api/script7/:path*',
    '/api/comp-list/:path*',
    '/api/autocomplete/:path*',
    '/api/download/:path*'
  ],
} 