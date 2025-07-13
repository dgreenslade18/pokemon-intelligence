'use client'

import { useState, useEffect } from 'react'
import Script7Panel from '../components/Script7Panel'
import UserHeader from '../components/UserHeader'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show sign-in message if no session
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Authentication Required</h1>
          <p className="text-gray-600">Redirecting to sign-in...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-noise opacity-30" />
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl floating" />
      <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-xl floating-delayed" />
      <div className="absolute bottom-20 left-1/2 w-40 h-40 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full blur-xl floating-slow" />
      
      {/* Content */}
      <div className="relative z-10">
        <UserHeader />
        <div className="container mx-auto px-4 py-8">
          <Script7Panel onBack={() => {}} />
        </div>
      </div>
    </main>
  )
} 