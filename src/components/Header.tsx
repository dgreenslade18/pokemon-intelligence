'use client'

import { useState, useEffect } from 'react'
import UserHeader from './UserHeader'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50  px-6 transition-all duration-300 ${
      isScrolled ? 'backdrop-blur-lg bg-white/10 dark:bg-black/10 border-b py-2 transition-all duration-300 border-black/20 dark:border-white/10' : 'py-6 border-black/0'
    }`}>
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold dark:text-white text-black">
            Card Intelligence
          </h1>
        </div>

        {/* User Dropdown */}
        <UserHeader />
      </div>
    </header>
  )
} 