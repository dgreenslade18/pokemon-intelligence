import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log('🔒 Basic middleware running for:', request.nextUrl.pathname)
  
  // Add a custom header to verify middleware is running
  const response = NextResponse.next()
  response.headers.set('X-Middleware-Test', 'BASIC-WORKING')
  
  // For testing, redirect homepage to sign-in
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    '/',
    '/api/script7'
  ],
} 