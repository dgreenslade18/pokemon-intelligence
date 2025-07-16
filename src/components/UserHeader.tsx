'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'

export default function UserHeader() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleProfileClick = () => {
    setShowDropdown(false)
    router.push('/account')
  }

  if (status === 'loading') {
    return (
      <div className="fixed top-0 right-0 z-50 p-6">
        <div className="backdrop-blur-lg rounded-2xl p-4 border" style={{ backgroundColor: 'var(--card-background)', borderColor: 'var(--card-border)' }}>
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'var(--text-primary)' }}></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="fixed top-0 right-0 z-50 p-6">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="backdrop-blur-lg rounded-2xl p-4 border transition-all duration-200 flex items-center space-x-3 bg-black/6 dark:bg-white/10 dark:border-white/20 border-black/20"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
            {session.user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="font-medium text-gray-900 dark:text-white">
              {session.user.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-sm capitalize text-gray-600 dark:text-gray-300">
              {(session.user.subscriptionStatus === 'free' ? 'TESTING' : session.user.subscriptionStatus) || 'TESTING'} plan
            </div>
          </div>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 text-gray-600 dark:text-gray-300 ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-64 backdrop-blur-lg rounded-2xl border shadow-2xl overflow-hidden z-50 bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20">
            <div className="p-4 border-b border-gray-200 dark:border-white/10">
              <div className="font-medium text-gray-900 dark:text-white">{session.user.email}</div>
              <div className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                Signed in • {(session.user.subscriptionStatus === 'free' ? 'TESTING' : session.user.subscriptionStatus) || 'TESTING'} Plan
              </div>
            </div>
            
            <div className="py-2">
              <button
                onClick={handleProfileClick}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Account
              </button>
              
              <button
                onClick={() => {
                  toggleTheme()
                  setShowDropdown(false)
                }}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(false)
                  router.push('/comp-list')
                }}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                My Comp List
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(false)
                  // Could add navigation to billing here
                }}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Billing & Subscription
              </button>
              
              <div className="border-t mt-2 pt-2 border-gray-200 dark:border-white/10">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 text-left text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
} 