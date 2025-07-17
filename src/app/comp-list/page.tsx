'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string | null
  recommended_price: string | null
  tcg_price: number | null
  ebay_average: number | null
  saved_at: string
  card_image_url: string | null
  set_name: string | null
}

interface ProgressUpdate {
  stage: string
  message: string
  current?: number
  total?: number
  percentage?: number
}

export default function CompListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showProgressOverlay, setShowProgressOverlay] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)

  // Filter comp list based on search term
  const filteredCompList = compList.filter(item => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      item.card_name.toLowerCase().includes(searchLower) ||
      (item.card_number && item.card_number.toLowerCase().includes(searchLower)) ||
      (item.set_name && item.set_name.toLowerCase().includes(searchLower))
    )
  })

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
    setShowProgressOverlay(true)
    setProgress(null)

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (refreshing) {
        setError('Request timed out. Please try again.')
        setRefreshing(false)
        setShowProgressOverlay(false)
      }
    }, 60000) // 60 second timeout

    try {
      // Use streaming response for progress updates
      const response = await fetch('/api/comp-list/refresh-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streamProgress: true }),
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.type === 'progress') {
                  console.log('Progress update:', data.stage, data.message)
                  setProgress({
                    stage: data.stage,
                    message: data.message,
                    current: data.current,
                    total: data.total,
                    percentage: data.percentage
                  })
                } else if (data.type === 'complete') {
                  console.log('Refresh complete:', data.data)
                  if (data.data.success) {
                    setCompList(data.data.items)
                    setMessage('Prices refreshed successfully!')
                    setTimeout(() => setMessage(''), 3000)
                  } else {
                    setError(data.data.error || 'Failed to refresh prices')
                  }
                  setShowProgressOverlay(false)
                } else if (data.type === 'error') {
                  setError(data.message)
                  setShowProgressOverlay(false)
                }
              } catch (e) {
                // Ignore parsing errors for SSE data
                console.warn('Failed to parse SSE data:', line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (err) {
      console.error('Streaming error, falling back to synchronous request:', err)
      
      // Clear the timeout since we're switching to fallback
      clearTimeout(timeoutId)
      
      // Fallback to synchronous request
      try {
        const response = await fetch('/api/comp-list/refresh-prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ streamProgress: false }),
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setCompList(data.items)
          setMessage('Prices refreshed!')
          setTimeout(() => setMessage(''), 3000)
        } else {
          setError(data.error || 'Failed to refresh prices')
        }
      } catch (fallbackErr) {
        setError(`Network error: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}`)
      } finally {
        setShowProgressOverlay(false)
      }
    } finally {
      clearTimeout(timeoutId)
      setRefreshing(false)
    }
  }

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'starting':
        return '📋'
      case 'analyzing':
        return '🔍'
      case 'complete':
        return '✅'
      default:
        return '⚡'
    }
  }

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'starting':
        return 'from-gray-500 to-gray-600'
      case 'fetching':
        return 'from-blue-500 to-blue-600'
      case 'updating':
        return 'from-green-500 to-green-600'
      default:
        return 'from-purple-500 to-purple-600'
    }
  }

  // Generate CSV data for download
  const generateCSVData = () => {
    if (!compList.length) return null

    const csvData = [
      ['Card Name', 'Card Number', 'Set Name', 'Recommended Price', 'TCG Price', 'eBay Average', 'Saved Date'],
      ...compList.map(item => [
        item.card_name,
        item.card_number || '',
        item.set_name || '',
        item.recommended_price || '',
        item.tcg_price?.toFixed(2) || '0.00',
        item.ebay_average?.toFixed(2) || '0.00',
        new Date(item.saved_at).toLocaleDateString()
      ])
    ]

    return csvData.map(row => row.join(',')).join('\n')
  }

  // Handle CSV download
  const handleDownload = () => {
    const csvData = generateCSVData()
    if (!csvData) return

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comp_list_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading comp list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Progress Overlay */}
      {showProgressOverlay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-md mx-4 border border-white/20">
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4 animate-bounce">
                  {progress ? getProgressIcon(progress.stage) : '🔄'}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Refreshing Prices
                </h3>
                <p className="text-white/60">
                  Updating prices for all cards in your comp list...
                </p>
              </div>

              {progress && (
                <div className="space-y-4">
                  <div className={`bg-gradient-to-r ${getProgressColor(progress.stage)} rounded-2xl p-4`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getProgressIcon(progress.stage)}
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-white capitalize">
                          {progress.stage.replace('_', ' ')}
                        </div>
                        <div className="text-white/80 text-sm">
                          {progress.message}
                        </div>
                        {progress.current !== undefined && progress.total !== undefined && (
                          <div className="text-white/60 text-xs mt-1">
                            {progress.current} of {progress.total} cards
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {progress.percentage !== undefined && (
                    <div className="mt-6">
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-white/50 text-xs mt-2">
                        {progress.percentage}% complete
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress?.percentage || 0}%` }}
                  ></div>
                </div>
                <p className="text-white/50 text-xs mt-2">
                  This usually takes 10-30 seconds depending on the number of cards
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-8 group transition-all duration-300 font-medium"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-5xl font-bold gradient-text mb-4">
            My Comp List
          </h1>
          <p className="text-white/60 text-xl font-light">
            Your saved card comparisons and prices
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-300"
            />
          </div>
          
          <div className="flex gap-4 md:flex-row flex-col">
            {compList.length > 0 && (
              <>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-4 md:px-6 text-[14px] py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={handleRefreshPrices}
                  disabled={refreshing}
                  className="flex items-center px-4 md:px-6 text-[14px] py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
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
              </>
            )}
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
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-2">{compList.length}</div>
              <div className="text-white/60">Total Cards</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">
                £{(() => {
                  const validTcgPrices = compList.filter(item => item.tcg_price && item.tcg_price > 0)
                  if (validTcgPrices.length === 0) return '0.00'
                  const total = validTcgPrices.reduce((sum, item) => sum + (item.tcg_price || 0), 0)
                  return (total / validTcgPrices.length).toFixed(2)
                })()}
              </div>
              <div className="text-white/60">Avg TCG Price</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                £{(() => {
                  const validEbayPrices = compList.filter(item => item.ebay_average && item.ebay_average > 0)
                  if (validEbayPrices.length === 0) return '0.00'
                  const total = validEbayPrices.reduce((sum, item) => sum + (item.ebay_average || 0), 0)
                  return (total / validEbayPrices.length).toFixed(2)
                })()}
              </div>
              <div className="text-white/60">Avg eBay Price</div>
            </div>
          </div>
        )}

        {/* Content */}
        {compList.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📋</div>
            <h3 className="text-2xl font-bold text-white mb-4">No Cards Saved Yet</h3>
            <p className="text-white/60 mb-8">
              Use the Card Comp feature to analyze card prices and save them to your list.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105"
            >
              Start Analyzing Cards
            </button>
          </div>
        ) : filteredCompList.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-4">No Cards Found</h3>
            <p className="text-white/60">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompList.map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300">
                {/* Card Image */}
                {item.card_image_url && (
                  <div className="mb-4">
                    <img 
                      src={item.card_image_url} 
                      alt={item.card_name}
                      className="w-full h-48 object-cover rounded-xl shadow-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
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
  )
} 