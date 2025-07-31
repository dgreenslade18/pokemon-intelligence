'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../../../components/Button'
import Header from '../../../components/Header'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        isSignup: 'false',
        callbackUrl: '/',
        redirect: true,
      })

      // If we get here, there was an error
      if (result?.error) {
        setError('Invalid email or password')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative">
      {/* Background Images - Theme Specific */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat block dark:hidden"
        style={{ backgroundImage: "url(/lightBg2.png)" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:block hidden"
        style={{ backgroundImage: "url(/bg.jpg)" }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <Header />
        
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-black dark:text-white mb-8">
                Sign In
              </h1>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/20 border border-black/20 dark:border-white/30 rounded-xl text-black dark:text-white placeholder-black/70 dark:placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/20 border border-black/20 dark:border-white/30 rounded-xl text-black dark:text-white placeholder-black/70 dark:placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  size="large"
                  className="w-full"
                  color="white"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-black/70 dark:text-white/70">
                  Need access?{' '}
                  <Link
                    href="/"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold transition-colors"
                  >
                    Request an invitation
                  </Link>
                </p>
                <p className="text-black/70 dark:text-white/70">
                  <Link
                    href="/auth/forgot-password"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 