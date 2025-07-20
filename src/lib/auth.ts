import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail, createUser, getUserById, updateLastLogin } from './db'

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const email = credentials.email as string
        const password = credentials.password as string
        const isSignup = (credentials.isSignup as string) === 'true'

        try {
          if (isSignup) {
            // Sign up flow
            const existingUser = await getUserByEmail(email)
            
            if (existingUser) {
              throw new Error('User already exists')
            }

            const hashedPassword = await bcrypt.hash(password, 12)
            const user = await createUser(email, hashedPassword)

            return {
              id: user.id,
              email: user.email,
              subscriptionStatus: user.subscription_status
            }
          } else {
            // Sign in flow
            const user = await getUserByEmail(email)

            if (!user) {
              throw new Error('No user found')
            }

            const isValid = await bcrypt.compare(password, user.password_hash)

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
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
})

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