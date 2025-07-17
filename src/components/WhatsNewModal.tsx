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