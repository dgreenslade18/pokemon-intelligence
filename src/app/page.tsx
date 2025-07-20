'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useState } from 'react'
import Script7Panel from '../components/Script7Panel'
import Header from '../components/Header'

export default function HomePage() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // If user is authenticated, redirect to the main app
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (session) {
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
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <Header />
          <div className="max-w-[1280px] mx-auto px-4 py-8">
            <Script7Panel onBack={() => {}} hideBackButton={true} />
          </div>
        </div>
      </main>
    )
  }

  // Landing page for non-authenticated users
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/email-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
      } else {
        console.error('Failed to submit email')
      }
    } catch (error) {
      console.error('Error submitting email:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="text-white text-2xl font-bold">Card Intelligence</div>
        <a 
          href="/auth/signin" 
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Sign In
        </a>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="max-w-2xl text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            You're Invited
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-8">
            Join the exclusive beta for Card Intelligence
          </p>
          
          <p className="text-lg text-gray-300 mb-12 max-w-xl mx-auto">
            Get early access to advanced Pokemon UK card price analysis, market trends, and trading insights. 
            Be among the first to experience the future of UK Pokemon card trading.
          </p>


          {/* Email Collection Form */}
          {!submitted ? (
            <form onSubmit={handleEmailSubmit} className="max-w-lg mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-6 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Get Early Access'}
                </button>
              </div>
            </form>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-6">
                <h3 className="text-green-400 text-xl font-semibold mb-2">Thank You!</h3>
                <p className="text-green-300">
                  We've received your interest. We'll be in touch soon with your early access invitation.
                </p>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-8 pb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-300 text-sm">
                Real-time price tracking and market analysis
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Smart Insights</h3>
              <p className="text-gray-300 text-sm">
                AI-powered trading recommendations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-300 text-sm">
                Instant price comparisons across platforms
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <FAQItem key={index} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// FAQ Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-white/5 transition-colors"
      >
        <span className="text-white font-semibold text-lg">{question}</span>
        <svg
          className={`w-6 h-6 text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

// FAQ Data
const faqs = [
  {
    question: "What is Card Intelligence?",
    answer: "Card Intelligence is an advanced platform designed specifically for UK Pokemon card traders and collectors. It provides real-time price analysis, market trends, and trading insights to help you make informed decisions about buying, selling, and trading Pokemon cards."
  },
  {
    question: "How does the early access work?",
    answer: "Early access is currently limited to a select group of users. When you submit your email, you'll be added to our waitlist. We'll review your application and send you an invitation with login credentials when your access is ready. This helps us ensure a smooth experience for all users."
  },
  {
    question: "What data sources do you use?",
    answer: "We aggregate data from multiple sources including eBay UK, TCG API, and other major UK Pokemon card marketplaces. Our system continuously monitors price changes, sales history, and market trends to provide you with the most accurate and up-to-date information."
  },
  {
    question: "Is this only for UK Pokemon cards?",
    answer: "Yes, Card Intelligence is specifically designed for the UK Pokemon card market. We focus on UK-specific pricing, market conditions, and trading patterns to provide the most relevant insights for UK traders and collectors."
  },
  {
    question: "How accurate are the price predictions?",
    answer: "Our price analysis uses advanced algorithms and machine learning to analyze market trends, but no prediction is 100% guaranteed. We provide confidence scores and market volatility indicators to help you understand the reliability of our insights. Always do your own research before making trading decisions."
  },
  {
    question: "Can I track my collection?",
    answer: "Yes! You can create multiple lists to track different aspects of your collection - cards you own, cards you're watching, potential purchases, and more. Our system will monitor price changes for all cards in your lists and provide you with updates."
  },
  {
    question: "How often is the data updated?",
    answer: "Our data is updated in real-time as new information becomes available. Price changes, new listings, and market movements are reflected immediately in our system. For historical data and trends, we maintain comprehensive records going back months."
  },
  {
    question: "Is there a mobile app?",
    answer: "Currently, Card Intelligence is optimized for web browsers and works great on mobile devices. We're actively developing a dedicated mobile app that will be available soon for an even better mobile experience."
  },
  {
    question: "What makes this different from other card tracking tools?",
    answer: "Card Intelligence is specifically built for the UK Pokemon card market with advanced features like confidence scoring, market trend analysis, and volatility tracking. Unlike generic tools, we understand the unique dynamics of the UK Pokemon card trading scene."
  },
  {
    question: "How do I get support if I have issues?",
    answer: "Once you have access, you can reach our support team through the in-app support system. We're committed to providing excellent customer service and will help you get the most out of Card Intelligence."
  }
] 