'use client'

import { useState } from 'react'

interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  type: 'feature' | 'improvement' | 'fix' | 'performance'
  icon: string
}

interface WhatsNewModalProps {
  isOpen: boolean
  onClose: () => void
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v2.6.2',
    date: '2025-01-28',
    title: 'Layout Height Fix',
    description: 'Fixed container height adjustment issues where the body height would not properly expand when content loaded. Removed problematic absolute positioning and improved responsive layout behavior.',
    type: 'fix',
    icon: '🔧'
  },
  {
    version: 'v2.6.1',
    date: '2025-01-28',
    title: 'Enhanced eBay Scraping System',
    description: 'Major improvements to eBay scraping with better price extraction, enhanced sold listings analysis, and improved promotional/variant detection. Added robust error handling and fallback mechanisms for more reliable data collection.',
    type: 'improvement',
    icon: '🔍'
  },
  {
    version: 'v2.6.0',
    date: '2025-01-28',
    title: 'Market Insights Dashboard',
    description: 'Introducing the new Market Insights feature! Get real-time trending cards data, market analysis, and price movements. Features beautiful charts, trend indicators, and seamless integration with the main analysis tool. Automatically displays when no search is active.',
    type: 'feature',
    icon: '📊'
  },
  {
    version: 'v2.5.0',
    date: '2025-01-27',
    title: 'Major Search & Analysis UX Revolution',
    description: 'Complete overhaul of the search experience with progressive loading, instant eBay results, smart autocomplete, and enhanced card matching. The search modal is gone - now you get immediate results with beautiful shimmer effects while data loads. Click any autocomplete item for instant specific card analysis!',
    type: 'feature',
    icon: '🚀'
  },
  {
    version: 'v2.4.1',
    date: '2025-01-27',
    title: 'UI Updates',
    description: 'Enhanced FAQ section with clean, minimal design featuring improved animations and better mobile responsiveness. Updated button components with sophisticated hover effects.',
    type: 'improvement',
    icon: '🎨'
  },
  {
    version: 'v2.4.0',
    date: '2025-07-20',
    title: 'Email System Integration',
    description: 'Complete email system with Resend integration. Welcome emails sent automatically on submission, access granted emails with temporary passwords, password reset functionality, and email tracking in admin panel.',
    type: 'feature',
    icon: '📧'
  },
  {
    version: 'v2.3.1',
    date: '2025-07-20',
    title: 'Date Format Updates',
    description: 'Updated all date displays to UK format (DD/MM/YYYY) for better user experience and consistency across the application.',
    type: 'improvement',
    icon: '📅'
  },
  {
    version: 'v2.3.0',
    date: '2024-01-15',
    title: 'Mobile Layout Overhaul',
    description: 'Completely redesigned mobile experience with improved card layouts, responsive grid systems, and better touch interactions. Cards now display image and pricing info side-by-side with confidence metrics below.',
    type: 'improvement',
    icon: '📱'
  },
  {
    version: 'v2.2.5',
    date: '2024-01-15',
    title: 'Enhanced Autocomplete',
    description: 'Rewrote autocomplete API with parallel calls to Pokemon TCG API and TCGDx, added intelligent caching, fallback data, and spelling corrections. Improved speed and data quality significantly.',
    type: 'performance',
    icon: '⚡'
  },
  {
    version: 'v2.2.4',
    date: '2024-01-15',
    title: 'Search Query Improvements',
    description: 'Fixed multi-word search queries by implementing proper wildcard handling. Searches like "mew ex 232" now work correctly without causing API errors.',
    type: 'fix',
    icon: '🔍'
  },
  {
    version: 'v2.2.3',
    date: '2024-01-15',
    title: 'Price Extraction Enhancement',
    description: 'Enhanced price extraction logic to check multiple price types and fallback fields with detailed logging. Improved accuracy of pricing data display.',
    type: 'improvement',
    icon: '💰'
  },
  {
    version: 'v2.2.2',
    date: '2024-01-15',
    title: 'Runtime Error Fixes',
    description: 'Added comprehensive null checks and error handling to prevent runtime errors in Script7Panel and other components.',
    type: 'fix',
    icon: '🛠️'
  },
  {
    version: 'v2.2.1',
    date: '2024-01-15',
    title: 'Dropdown Width Extensions',
    description: 'Extended dropdown widths for better readability and improved list name display across all components.',
    type: 'improvement',
    icon: '📋'
  },
  {
    version: 'v2.2.0',
    date: '2024-01-15',
    title: 'Card Name Capitalization',
    description: 'Added automatic card name capitalization for consistent display. Pokemon names are properly capitalized, special terms (EX, GX, V, VMAX) are uppercase, and other words use title case.',
    type: 'improvement',
    icon: '✨'
  },
  {
    version: 'v2.1.5',
    date: '2024-01-15',
    title: 'Enhanced Dropdown Experience',
    description: 'Extended the "My Comp List" dropdown width by 35% for better readability and improved list name display.',
    type: 'improvement',
    icon: '📋'
  },
  {
    version: 'v2.1.4',
    date: '2024-01-15',
    title: 'Smooth Grid Animations',
    description: 'Added enhanced CSS animations for grid transitions between 3x and 4x layouts with staggered card animations and GPU acceleration.',
    type: 'improvement',
    icon: '🎬'
  },
  {
    version: 'v2.1.3',
    date: '2024-01-15',
    title: 'Layout Improvements',
    description: 'Reorganized comp list page layout: moved data explanations to bottom, repositioned search bar under statistics, and aligned view toggle with search bar.',
    type: 'improvement',
    icon: '🎨'
  },
  {
    version: 'v2.1.2',
    date: '2024-01-15',
    title: 'Multiple Lists Feature',
    description: 'Complete multiple lists system with unlimited private lists, list management modal, card counts, and smart card addition flow.',
    type: 'feature',
    icon: '📚'
  },
  {
    version: 'v2.1.1',
    date: '2024-01-15',
    title: 'What\'s New Feature',
    description: 'Added "What\'s New" modal accessible from user dropdown with detailed changelog and feature highlights.',
    type: 'feature',
    icon: '🎉'
  },
  {
    version: 'v2.1.0',
    date: '2024-01-15',
    title: 'Real-Time Progress Updates',
    description: 'Added live progress tracking during price refreshes with card-specific updates and accurate progress percentages.',
    type: 'feature',
    icon: '🚀'
  },
  {
    version: 'v2.0.5',
    date: '2024-01-15',
    title: 'Confidence Meter Tooltips',
    description: 'Enhanced confidence meter with detailed tooltips explaining confidence levels, trends, changes, and volatility metrics.',
    type: 'improvement',
    icon: '💡'
  },
  {
    version: 'v2.0.4',
    date: '2024-01-15',
    title: 'Streaming Progress Fix',
    description: 'Fixed streaming progress updates by adding streamProgress parameter and improved SSE data handling.',
    type: 'fix',
    icon: '🔧'
  },
  {
    version: 'v2.0.3',
    date: '2024-01-15',
    title: 'Performance Optimizations',
    description: 'Increased batch size to 6 cards, added caching to avoid re-analyzing duplicates, and reduced search variations by 50%.',
    type: 'performance',
    icon: '⚡'
  },
  {
    version: 'v2.0.2',
    date: '2024-01-15',
    title: 'Data Type Explanations',
    description: 'Added helpful explanations for different data types and pending states for cards without confidence data.',
    type: 'improvement',
    icon: '📊'
  },
  {
    version: 'v2.0.1',
    date: '2024-01-15',
    title: 'Confidence Meter System',
    description: 'Implemented comprehensive confidence scoring system with volatility tracking and market trend analysis.',
    type: 'feature',
    icon: '🎯'
  },
  {
    version: 'v2.0.0',
    date: '2024-01-15',
    title: 'Comp List Management',
    description: 'Complete comp list system with save, refresh, export, and confidence tracking capabilities.',
    type: 'feature',
    icon: '📋'
  }
]

const getTypeColor = (type: string) => {
  switch (type) {
    case 'feature':
      return 'from-blue-500 to-purple-500'
    case 'improvement':
      return 'from-green-500 to-emerald-500'
    case 'fix':
      return 'from-orange-500 to-red-500'
    case 'performance':
      return 'from-yellow-500 to-orange-500'
    default:
      return 'from-gray-500 to-gray-600'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'feature':
      return 'New Feature'
    case 'improvement':
      return 'Improvement'
    case 'fix':
      return 'Bug Fix'
    case 'performance':
      return 'Performance'
    default:
      return 'Update'
  }
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎉</div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">What's New</h2>
                <p className="text-white/60">Latest updates and improvements to Card Intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors duration-200"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {changelog.map((entry, index) => (
              <div key={index} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{entry.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-semibold">{entry.title}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTypeColor(entry.type)} text-white`}>
                        {getTypeLabel(entry.type)}
                      </span>
                      <span className="text-white/40 text-sm">{entry.version}</span>
                    </div>
                    <p className="text-white/70 mb-3">{entry.description}</p>
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(entry.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              Want to suggest a feature? Contact me at{' '}
              <a href="mailto:domgreenslade@me.com" className="text-blue-400 hover:text-blue-300 transition-colors">
              domgreenslade@me.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 