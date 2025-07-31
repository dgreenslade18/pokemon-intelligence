'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '../../../../components/Button'
import Header from '../../../../components/Header'

export default function InviteSignup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [inviteValid, setInviteValid] = useState(false)
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  useEffect(() => {
    const verifyInvite = async () => {
      try {
        const response = await fetch(`/api/auth/verify-invite/${token}`)
        const data = await response.json()

        if (data.valid) {
          setEmail(data.email)
          setInviteValid(true)
        } else {
          setError('Invalid or expired invite link')
        }
      } catch (error) {
        setError('Failed to verify invite link')
      } finally {
        setVerifying(false)
      }
    }

    if (token) {
      verifyInvite()
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      // Complete the invite
      const response = await fetch('/api/auth/complete-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      })

      const data = await response.json()

      if (data.success) {
        // Automatically sign in the user
        const signInResult = await signIn('credentials', {
          email,
          password,
          isSignup: 'false',
          callbackUrl: '/',
          redirect: false,
        })

        if (signInResult?.ok) {
          router.push('/')
        } else {
          // If auto sign-in fails, redirect to sign-in page
          router.push('/auth/signin?message=Account created successfully. Please sign in.')
        }
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
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
          <Header />
          
          <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
            <div className="max-w-md w-full space-y-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
                    Verifying Invite
                  </h3>
                  <p className="text-black/70 dark:text-white/70">
                    Please wait while we verify your invitation...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!inviteValid) {
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
          <Header />
          
          <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
            <div className="max-w-md w-full space-y-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="text-center space-y-6">
                  <div className="text-6xl mb-4">❌</div>
                  
                  <h3 className="text-xl font-semibold text-black dark:text-white">
                    Invalid Invite
                  </h3>
                  
                  <p className="text-black/70 dark:text-white/70 leading-relaxed">
                    {error || 'This invite link is invalid or has expired. Please request a new invitation.'}
                  </p>

                  <div className="pt-4">
                    <Button
                      onClick={() => router.push('/')}
                      size="large"
                      color="white"
                    >
                      Request New Invitation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
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
              <h1 className="text-2xl font-semibold text-black dark:text-white mb-2">
                Create Your Account
              </h1>
              <p className="text-black/70 dark:text-white/70">
                You're invited! Set your password to get started.
              </p>
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
                    disabled
                    className="w-full px-4 py-3 bg-gray-100/50 border border-gray-300/50 rounded-xl text-black dark:text-white placeholder-black/50 dark:placeholder-white/50 cursor-not-allowed opacity-70"
                    placeholder="Your email address"
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
                    minLength={8}
                    className="w-full px-4 py-3 dark:bg-white/20 border dark:border-white/30 rounded-xl text-black dark:text-white placeholder-black/70 dark:placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Create a password (min 8 characters)"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-black dark:text-white placeholder-black/70 dark:placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
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
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-black/70 dark:text-white/70 text-sm">
                  By creating an account, you're accepting your invitation to Card Intelligence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 