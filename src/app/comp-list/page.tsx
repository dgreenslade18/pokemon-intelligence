'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string | null
  recommended_price: number | null
  tcg_price: number | null
  ebay_average: number | null
  saved_at: string
  card_image_url: string | null
  set_name: string | null
}

export default function CompListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Load comp list
  useEffect(() => {
    const loadCompList = async () => {
      if (!session?.user?.id) return

      try {
        const response = await fetch('/api/comp-list')
        if (response.ok) {
          const result = await response.json()
          setCompList(result.items || [])
        } else {
          console.error('Failed to load comp list')
          setError('Failed to load comp list')
        }
      } catch (error) {
        console.error('Error loading comp list:', error)
        setError('Error loading comp list')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      loadCompList()
    }
  }, [session])

  const handleRemoveFromCompList = async (itemId: string) => {
    try {
      const response = await fetch(`/api/comp-list?id=${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCompList(prev => prev.filter(item => item.id !== itemId))
        setMessage('Card removed from comp list!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError('Failed to remove card from comp list')
      }
    } catch (error) {
      setError('An error occurred while removing card')
    }
  }

  const handleRefreshPrices = async () => {
    setRefreshing(true)
    setError('')
    try {
      const response = await fetch('/api/comp-list/refresh-prices', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setCompList(data.items)
        setMessage('Prices refreshed!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to refresh prices')
      }
    } catch (err) {
      setError('Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  const exportToCSV = () => {
    if (compList.length === 0) return

    const headers = ['Card Name', 'Card Number', 'Set', 'TCG Price (£)', 'eBay Average (£)', 'Recommended Price (£)', 'Saved Date']
    const csvData = compList.map(item => [
      item.card_name,
      item.card_number || '',
      item.set_name || '',
      Number(item.tcg_price).toFixed(2) || '0.00',
      Number(item.ebay_average).toFixed(2) || '0.00',
      Number(item.recommended_price).toFixed(2) || '0.00',
      new Date(item.saved_at).toLocaleDateString()
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `comp-list-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Comp List</h1>
              <p className="text-gray-300">Your saved card price comparisons</p>
            </div>
            <div className="flex gap-4">
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
              {compList.length > 0 && (
                <button
                  onClick={handleRefreshPrices}
                  disabled={refreshing}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                >
                  {refreshing ? (
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {refreshing ? 'Refreshing...' : 'Refresh Prices'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Statistics */}
        {compList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
              <div className="text-2xl font-bold text-blue-400">{compList.length}</div>
              <div className="text-gray-400 text-sm">Total Cards Saved</div>
            </div>
            <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
              <div className="text-2xl font-bold text-green-400">
                £{compList.reduce((sum, item) => sum + (Number(item.tcg_price) || 0), 0).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">Total TCG Value</div>
            </div>
            <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
              <div className="text-2xl font-bold text-purple-400">
                £{compList.reduce((sum, item) => sum + (Number(item.ebay_average) || 0), 0).toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">Total eBay Value</div>
            </div>
          </div>
        )}

        {/* Comp List Content */}
        <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Saved Cards</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading your comp list...</p>
            </div>
          ) : compList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">Your Comp List is Empty</h3>
              <p className="text-gray-400 mb-6">Start using the Card Comp feature to save profitable cards here!</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Start Finding Cards
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {compList.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-200">
                  {/* Card Image */}
                  {item.card_image_url && (
                    <div className="mb-4">
                      <img
                        src={item.card_image_url}
                        alt={item.card_name}
                        className="w-full h-48 object-contain rounded-lg bg-white/5"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Card Info */}
                  <div className="mb-4">
                    <h3 className="text-white font-semibold text-lg mb-1">{item.card_name}</h3>
                    {item.card_number && (
                      <p className="text-gray-400 text-sm">#{item.card_number}</p>
                    )}
                    {item.set_name && (
                      <p className="text-gray-400 text-sm">{item.set_name}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      Saved {new Date(item.saved_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Pricing Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Number(item.tcg_price) > 0 && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide">TCG Price</p>
                        <p className="text-blue-400 font-semibold">£{Number(item.tcg_price).toFixed(2)}</p>
                      </div>
                    )}
                    
                    {Number(item.ebay_average) > 0 && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide">eBay Average</p>
                        <p className="text-purple-400 font-semibold">£{Number(item.ebay_average).toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromCompList(item.id)}
                    className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Remove from List
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 