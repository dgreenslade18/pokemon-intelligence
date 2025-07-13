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
        
        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Match all paths except public files
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 