'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUp() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to landing page after a short delay
    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎴 Pokemon Intelligence
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-8">
            Invitation Only
          </h2>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎫</div>
            
            <h3 className="text-xl font-semibold text-white">
              You're Invited
            </h3>
            
            <p className="text-white/80 leading-relaxed">
              Pokemon Intelligence is currently in private alpha. 
              To get access, please request an invitation on our landing page.
            </p>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Request Invitation
              </Link>
            </div>

            <p className="text-white/60 text-sm">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 