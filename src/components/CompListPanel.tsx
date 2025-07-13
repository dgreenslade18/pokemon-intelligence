'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface CompListPanelProps {
  onBack: () => void
}

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string
  recommended_price: string
  tcg_price: number
  ebay_average: number
  saved_at: string
  card_image_url?: string
  set_name?: string
}

export default function CompListPanel({ onBack }: CompListPanelProps) {
  const { data: session } = useSession()
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCompList = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/comp-list')
      const data = await response.json()

      if (data.success) {
        setCompList(data.items)
      } else {
        setError(data.error || 'Failed to fetch comp list')
      }
    } catch (err) {
      setError('Failed to fetch comp list')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const response = await fetch(`/api/comp-list?id=${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setCompList(prev => prev.filter(item => item.id !== id))
      } else {
        setError('Failed to delete item')
      }
    } catch (err) {
      setError('Failed to delete item')
    } finally {
      setDeletingId(null)
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Card Name', 'Card Number', 'Set', 'Recommended Price', 'TCG Price', 'eBay Average', 'Date Saved'],
      ...compList.map(item => [
        item.card_name,
        item.card_number,
        item.set_name || '',
        item.recommended_price,
        `£${item.tcg_price.toFixed(2)}`,
        `£${item.ebay_average.toFixed(2)}`,
        new Date(item.saved_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comp-list-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchCompList()
    }
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Please Sign In</h2>
          <p className="text-white/60">You need to be signed in to view your comp list.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={onBack}
            className="flex items-center text-white/60 hover:text-white mb-8 group transition-all duration-300"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Scripts
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold gradient-text mb-4">
                My Comp List
              </h1>
              <p className="text-white/60 text-xl font-light">
                Your saved card comparisons and prices
              </p>
            </div>
            
            {compList.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-4xl mb-4">🎴</div>
                <div className="text-white/60">Loading your comp list...</div>
              </div>
            </div>
          ) : error ? (
            <div className="bento-card rounded-3xl p-10 text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-lg">{error}</p>
              </div>
              <button
                onClick={fetchCompList}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          ) : compList.length === 0 ? (
            <div className="bento-card rounded-3xl p-10 text-center">
              <div className="text-6xl mb-6">📋</div>
              <h3 className="text-2xl font-bold text-white mb-4">No Cards Saved Yet</h3>
              <p className="text-white/60 mb-8">
                Use the Card Comp feature to analyze card prices and save them to your list.
              </p>
              <button
                onClick={onBack}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105"
              >
                Start Analyzing Cards
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bento-card rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Saved Cards ({compList.length})
                </h2>
                
                <div className="grid gap-6">
                  {compList.map((item) => (
                    <div key={item.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <div className="flex items-start gap-6">
                        {/* Card Image */}
                        {item.card_image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={item.card_image_url}
                              alt={item.card_name}
                              className="w-20 h-28 object-cover rounded-lg bg-white/10"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Card Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-white mb-1">
                                {item.card_name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-white/60">
                                {item.card_number && (
                                  <span>#{item.card_number}</span>
                                )}
                                {item.set_name && (
                                  <span>• {item.set_name}</span>
                                )}
                                <span>• Saved {new Date(item.saved_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20 transition-colors duration-200 disabled:opacity-50"
                            >
                              {deletingId === item.id ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                          
                          {/* Price Information */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-4">
                              <div className="text-sm text-white/60 mb-1">Recommended Price</div>
                              <div className="text-lg font-bold text-green-300">
                                {item.recommended_price}
                              </div>
                            </div>
                            
                            <div className="bg-white/10 rounded-xl p-4">
                              <div className="text-sm text-white/60 mb-1">TCG API Price</div>
                              <div className="text-lg font-bold text-purple-300">
                                £{item.tcg_price.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="bg-white/10 rounded-xl p-4">
                              <div className="text-sm text-white/60 mb-1">eBay Average</div>
                              <div className="text-lg font-bold text-blue-300">
                                £{item.ebay_average.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 