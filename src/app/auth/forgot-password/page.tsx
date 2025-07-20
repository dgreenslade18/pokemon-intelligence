'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../../../components/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/email/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send password reset email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Card Intelligence</h1>
          <p className="text-gray-300">Reset your password</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          {status === 'success' ? (
            <div className="text-center">
              <div className="text-green-400 text-6xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-white mb-4">Check your email</h2>
              <p className="text-gray-300 mb-6">
                {message}
              </p>
              <Link 
                href="/auth/signin"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3">
                  <p className="text-red-300 text-sm">{message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === 'loading'}
                size="large"
                className="w-full"
              >
                {status === 'loading' ? 'Sending...' : 'Send reset link'}
              </Button>

              <div className="text-center">
                <Link 
                  href="/auth/signin"
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 