'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useApiStatus } from '../hooks/useApiStatus'
import ApiStatusModal from './ApiStatusModal'
import WhatsNewModal from './WhatsNewModal'

export default function UserHeader() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showApiStatusModal, setShowApiStatusModal] = useState(false)
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false)
  const [userLevel, setUserLevel] = useState<'tester' | 'super_admin' | null>(null)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { healthStatus, getStatusIcon, getStatusText } = useApiStatus()

  // Check user level when session changes
  useEffect(() => {
    if (session?.user?.email) {
      const checkUserLevel = async () => {
        try {
          const response = await fetch('/api/user-level', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          if (response.ok) {
            const data = await response.json()
            setUserLevel(data.userLevel)
          } else {
            // Fallback: set to tester if API fails
            setUserLevel('tester')
          }
        } catch (error) {
          console.error('Error checking user level:', error)
          // Fallback: set to tester if API fails
          setUserLevel('tester')
        }
      }
      checkUserLevel()
    }
  }, [session])

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

  const handleUsersClick = () => {
    setShowDropdown(false)
    router.push('/account/users')
  }

  const handleApiStatusClick = () => {
    setShowDropdown(false)
    setShowApiStatusModal(true)
  }

  const handleWhatsNewClick = () => {
    setShowDropdown(false)
    setShowWhatsNewModal(true)
  }

  if (status === 'loading') {
    return (
      <div className="backdrop-blur-lg rounded-2xl p-4 border" style={{ backgroundColor: 'var(--card-background)', borderColor: 'var(--card-border)' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'var(--text-primary)' }}></div>
      </div>
    )
  }

  // Show Sign In button for non-authenticated users
  if (!session) {
    return (
      <a 
        href="/auth/signin" 
        className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
      >
        Sign In
      </a>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="backdrop-blur-lg rounded-2xl py-2 px-4 border transition-all duration-200 flex items-center space-x-3 bg-black/6 dark:bg-white/10 dark:border-white/20 border-black/20"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
          {session.user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="text-left hidden sm:block">
          <div className="font-medium text-gray-900 dark:text-white">
            {session.user.email?.split('@')[0] || 'User'}
          </div>
          {/* <div className="text-sm capitalize text-gray-600 dark:text-gray-300">
            {(session.user.subscriptionStatus === 'free' ? 'Test' : session.user.subscriptionStatus) || 'Test'} plan
          </div> */}
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
        <div className="absolute top-full right-0 mt-2 w-64 backdrop-blur-lg rounded-2xl border shadow-2xl overflow-hidden z-50 bg-white/95 dark:bg-gray-900/95 border-white/30 dark:border-gray-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 ">
            <div className="font-medium text-gray-900 dark:text-white">{session.user.email}</div>
            <div className="text-sm mt-1 text-gray-600 dark:text-gray-300">
              Signed in • {(session.user.subscriptionStatus === 'free' ? 'TESTING' : session.user.subscriptionStatus) || 'TESTING'} Plan
            </div>
          </div>
          
          <div className="py-2">
            <button
              onClick={handleProfileClick}
              className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Account
            </button>
            
            {/* Users Management for Super Admins */}
            {userLevel === 'super_admin' && (
              <button
                onClick={handleUsersClick}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Users
              </button>
            )}
            

            
            <button
              onClick={() => {
                toggleTheme()
                setShowDropdown(false)
              }}
              className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
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
              className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              My Comp List
            </button>
            
            <button
              onClick={handleWhatsNewClick}
              className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center justify-between text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What's New
              </div>
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                New
              </span>
            </button>
            
            <button
              onClick={() => {
                setShowDropdown(false)
                // Could add navigation to billing here
              }}
              className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Billing & Subscription
            </button>
            
            <div className="border-t mt-2 pt-2 border-gray-200 dark:border-white/10">
              <button
                onClick={handleApiStatusClick}
                className="w-full px-4 py-3 text-left transition-colors duration-200 flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <div className="w-5 h-5 mr-3 flex items-center justify-center">
                  {healthStatus ? (
                    <span className="text-sm">{getStatusIcon(healthStatus.overall_status)}</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">API Status</div>
                  {healthStatus && (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {getStatusText(healthStatus.overall_status)}
                    </div>
                  )}
                </div>
              </button>
              
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

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* API Status Modal */}
      <ApiStatusModal 
        isOpen={showApiStatusModal} 
        onClose={() => setShowApiStatusModal(false)} 
      />

      {/* What's New Modal */}
      <WhatsNewModal 
        isOpen={showWhatsNewModal} 
        onClose={() => setShowWhatsNewModal(false)} 
      />
    </div>
  )
} 