'use client'

import { useState, useEffect } from 'react'
import Script7Panel from '../components/Script7Panel'
import Header from '../components/Header'
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
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Images - Theme Specific */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat block dark:hidden"
        style={{ backgroundImage: 'url(/lightBg2.png)' }}
      />
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:block hidden"
        style={{ backgroundImage: 'url(/bg.jpg)' }}
      />
      
      {/* Subtle Noise Texture */}
      {/* <div className="absolute inset-0 bg-noise opacity-5" /> */}
      
      {/* Content */}
      <div className="relative z-10">
        <Header />
        <div className="max-w-[1280px] mx-auto px-4 py-8 pt-24">
          <Script7Panel onBack={() => {}} hideBackButton={true} />
        </div>
      </div>
    </main>
  )
} 