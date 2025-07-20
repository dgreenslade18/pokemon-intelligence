import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail, createUser, getUserById, updateLastLogin } from './db'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isSignup: { label: 'Is Signup', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const isSignup = credentials.isSignup === 'true'

        try {
          if (isSignup) {
            // Sign up flow
            const existingUser = await getUserByEmail(credentials.email)
            
            if (existingUser) {
              throw new Error('User already exists')
            }

            const hashedPassword = await bcrypt.hash(credentials.password, 12)
            const user = await createUser(credentials.email, hashedPassword)

            return {
              id: user.id,
              email: user.email,
              subscriptionStatus: user.subscription_status
            }
          } else {
            // Sign in flow
            const user = await getUserByEmail(credentials.email)

            if (!user) {
              throw new Error('No user found')
            }

            const isValid = await bcrypt.compare(credentials.password, user.password_hash)

            if (!isValid) {
              throw new Error('Invalid password')
            }

            // Update last login time
            await updateLastLogin(user.id)

            return {
              id: user.id,
              email: user.email,
              subscriptionStatus: user.subscription_status
            }
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.subscriptionStatus = user.subscriptionStatus
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.subscriptionStatus = token.subscriptionStatus as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
}

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    subscriptionStatus: string
  }
  
  interface Session {
    user: {
      id: string
      email: string
      subscriptionStatus: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    subscriptionStatus: string
  }
}

// Export only authOptions for Next.js 13+ App Router 