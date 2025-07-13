import { withAuth } from 'next-auth/middleware'

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    console.log('🔒 Middleware running for:', req.nextUrl.pathname)
    console.log('🔑 User token:', req.nextauth.token?.email)
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log('🔐 Authorization check - Token exists:', !!token)
        return !!token
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

export const config = {
  matcher: [
    // Only match specific protected routes
    '/',
    '/api/script1',
    '/api/script2', 
    '/api/script3',
    '/api/script4',
    '/api/script5',
    '/api/script6',
    '/api/script7',
    '/api/comp-list',
    '/api/autocomplete',
    '/api/download'
  ],
} 