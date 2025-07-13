import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🔒 Middleware running for:', request.nextUrl.pathname)
  
  const token = await getToken({ req: request })
  console.log('🔑 Token exists:', !!token)
  
  // Allow access to auth pages without authentication
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    console.log('✅ Allowing auth page access')
    return NextResponse.next()
  }
  
  // Allow access to API routes that don't require auth
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    console.log('✅ Allowing API auth access')
    return NextResponse.next()
  }
  
  // Allow access to init-db for database setup (only needed once)
  if (request.nextUrl.pathname === '/api/init-db') {
    console.log('✅ Allowing init-db access')
    return NextResponse.next()
  }
  
  // If no token, redirect to sign-in
  if (!token) {
    console.log('❌ No token, redirecting to sign-in')
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  console.log('✅ Token valid, allowing access')
  // Allow access for authenticated users
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 