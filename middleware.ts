import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can be added here
    // For now, we just protect the routes
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without authentication
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true
        }
        
        // Allow access to API routes that don't require auth
        if (req.nextUrl.pathname.startsWith('/api/auth/')) {
          return true
        }
        
        // Allow access to init-db for database setup
        if (req.nextUrl.pathname === '/api/init-db') {
          return true
        }
        
        // Allow access to homepage without authentication
        if (req.nextUrl.pathname === '/') {
          return true
        }
        
        // Allow access to public API routes
        if (req.nextUrl.pathname.startsWith('/api/script7') || 
            req.nextUrl.pathname.startsWith('/api/autocomplete')) {
          return true
        }
        
        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Temporarily disable middleware - only protect specific routes
    '/dashboard/:path*',
    '/profile/:path*',
    // '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 