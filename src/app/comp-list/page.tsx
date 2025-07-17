'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string | null
  recommended_price: string | null
  tcg_price: number | null
  ebay_average: number | null
  saved_at: string
  updated_at: string
  card_image_url: string | null
  set_name: string | null
  // Price tracking fields
  saved_tcg_price: number | null
  saved_ebay_average: number | null
  price_change_percentage: number | null
  price_volatility: number | null
  market_trend: 'increasing' | 'decreasing' | 'stable' | null
  confidence_score: number | null
}

interface ProgressUpdate {
  stage: string
  message: string
  current?: number
  total?: number
  percentage?: number
}

export default function CompListPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showProgressOverlay, setShowProgressOverlay] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [progressStages, setProgressStages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/comp-list')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCompList(data.compList || [])
        } else {
          setError(data.message || 'Failed to load comp list')
        }
      } else {
        setError('Failed to load comp list')
      }
    } catch (error) {
      console.error('Error loading comp list:', error)
      setError('Failed to load comp list')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromCompList = async (itemId: string) => {
    try {
      const response = await fetch('/api/comp-list', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCompList(prev => prev.filter(item => item.id !== itemId))
          setMessage('Card removed from comp list')
          setTimeout(() => setMessage(null), 3000)
        } else {
          setError(data.message || 'Failed to remove card')
        }
      } else {
        setError('Failed to remove card')
      }
    } catch (error) {
      console.error('Error removing card:', error)
      setError('Failed to remove card')
    }
  }

  const handleRefreshPrices = async () => {
    if (!session?.user?.id) {
      setError('Please sign in to refresh prices')
      return
    }

    setRefreshing(true)
    setError(null)
    setMessage(null)
    setProgress(null)
    setProgressStages(new Set())
    setShowProgressOverlay(true)

    try {
      const response = await fetch('/api/comp-list/refresh-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
                  setProgressStages(prev => new Set(Array.from(prev).concat(data.stage)))
                  setProgress({
                    stage: data.stage,
                    message: data.message,
                    current: data.current,
                    total: data.total,
                    percentage: data.percentage
                  })
                } else if (data.type === 'complete') {
                  console.log('Refresh completed')
                  setShowProgressOverlay(false)
                  setMessage('Prices refreshed successfully!')
                  setTimeout(() => setMessage(null), 3000)
                  loadData() // Reload the data
                } else if (data.type === 'error') {
                  setError(data.message)
                  setShowProgressOverlay(false)
                }
              } catch (e) {
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
      
      // Fallback to synchronous request
      try {
        const response = await fetch('/api/comp-list/refresh-prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setShowProgressOverlay(false)
          setMessage('Prices refreshed successfully!')
          setTimeout(() => setMessage(null), 3000)
          loadData() // Reload the data
        } else {
          setError(data.message || 'Failed to refresh prices')
          setShowProgressOverlay(false)
        }
      } catch (fallbackErr) {
        setError(`Network error: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error'}`)
        setShowProgressOverlay(false)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'starting':
      case 'analysis':
        return '🚀'
      case 'ebay':
        return '🏪'
      case 'cardmarket':
        return '🎮'
      default:
        return '⚡'
    }
  }

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'ebay':
        return 'from-blue-500 to-blue-600'
      case 'cardmarket':
        return 'from-purple-500 to-purple-600'
      case 'analysis':
        return 'from-orange-500 to-orange-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getProgressPercentage = (stage: string) => {
    // Calculate progress based on completed stages
    const completedStages = Array.from(progressStages)
    const totalStages = ['starting', 'ebay', 'cardmarket', 'analysis']
    const completedCount = totalStages.filter(s => completedStages.includes(s)).length
    
    // Base progress on completed stages rather than current stage
    const baseProgress = Math.min(90, (completedCount / totalStages.length) * 90)
    
    // Add some progress for the current stage to make it feel more responsive
    if (progress && progress.stage === stage) {
      return Math.min(baseProgress + 10, 90)
    }
    
    return baseProgress
  }

  // Generate CSV data for download
  const generateCSVData = () => {
    if (!compList.length) return null

    const csvData = [
      ['Card Name', 'Card Number', 'Set Name', 'Recommended Price', 'TCG Price', 'eBay Average', 'Price Change %', 'Market Trend', 'Confidence Score', 'Saved Date'],
      ...compList.map(item => [
        item.card_name,
        item.card_number || '',
        item.set_name || '',
        item.recommended_price || '',
        item.tcg_price?.toFixed(2) || '0.00',
        item.ebay_average?.toFixed(2) || '0.00',
        item.price_change_percentage?.toFixed(2) || '0.00',
        item.market_trend || 'unknown',
        item.confidence_score?.toFixed(1) || '0.0',
        new Date(item.saved_at).toLocaleDateString()
      ])
    ]

    return csvData.map(row => row.join(',')).join('\n')
  }

  const handleDownload = () => {
    const csvData = generateCSVData()
    if (!csvData) return

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comp-list-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Filter cards based on search term
  const filteredCards = compList.filter(item =>
    item.card_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.set_name && item.set_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate average confidence score
  const validConfidenceScores = compList.filter(item => item.confidence_score !== null && item.confidence_score > 0)
  const averageConfidence = validConfidenceScores.length > 0 
    ? validConfidenceScores.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / validConfidenceScores.length
    : 0

  // Confidence meter component
  const ConfidenceMeter = ({ item }: { item: CompListItem }) => {
    if (!item.confidence_score && item.confidence_score !== 0) {
      return (
        <div className="text-xs text-gray-400">
          Run "Refresh Prices" to see confidence data
        </div>
      )
    }

    const score = item.confidence_score || 0
    const getConfidenceColor = (score: number) => {
      if (score >= 8) return 'text-green-400'
      if (score >= 6) return 'text-yellow-400'
      if (score >= 4) return 'text-orange-400'
      return 'text-red-400'
    }

    const getConfidenceLabel = (score: number) => {
      if (score >= 8) return 'High'
      if (score >= 6) return 'Medium'
      if (score >= 4) return 'Low'
      return 'Very Low'
    }

    const getTrendColor = (trend: string | null) => {
      switch (trend) {
        case 'increasing': return 'text-green-400'
        case 'decreasing': return 'text-red-400'
        case 'stable': return 'text-blue-400'
        default: return 'text-gray-400'
      }
    }

    const getTrendIcon = (trend: string | null) => {
      switch (trend) {
        case 'increasing': return '↗️'
        case 'decreasing': return '↘️'
        case 'stable': return '→'
        default: return '?'
      }
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Confidence</span>
          <span className={`text-xs font-medium ${getConfidenceColor(score)}`}>
            {getConfidenceLabel(score)} ({score.toFixed(1)})
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              score >= 8 ? 'bg-green-400' : 
              score >= 6 ? 'bg-yellow-400' : 
              score >= 4 ? 'bg-orange-400' : 'bg-red-400'
            }`}
            style={{ width: `${(score / 10) * 100}%` }}
          ></div>
        </div>

        {item.market_trend && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Trend</span>
            <span className={`font-medium ${getTrendColor(item.market_trend)}`}>
              {getTrendIcon(item.market_trend)} {item.market_trend}
            </span>
          </div>
        )}

        {item.price_change_percentage !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Change</span>
            <span className={`font-medium ${
              item.price_change_percentage > 0 ? 'text-green-400' : 
              item.price_change_percentage < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {item.price_change_percentage > 0 ? '+' : ''}{item.price_change_percentage.toFixed(1)}%
            </span>
          </div>
        )}

        {item.price_volatility !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Volatility</span>
            <span className={`font-medium ${
              item.price_volatility < 10 ? 'text-green-400' : 
              item.price_volatility < 25 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {item.price_volatility.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Header />
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view your comp list</h1>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Header />
      
      {/* Progress Overlay */}
      {showProgressOverlay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-md mx-4 border border-white/20">
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4 animate-bounce">
                  {progress ? getProgressIcon(progress.stage) : '🚀'}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Refreshing Prices
                </h3>
                <p className="text-white/60">
                  Please wait while we update your card prices...
                </p>
              </div>

              {progress && (
                <div className="space-y-4">
                  <div className={`bg-gradient-to-r ${getProgressColor(progress.stage)} rounded-2xl p-4`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getProgressIcon(progress.stage)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white capitalize">
                          {progress.stage.replace('_', ' ')}
                        </div>
                        <div className="text-white/80 text-sm">
                          {progress.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className={`p-3 rounded-xl transition-all duration-300 ${
                      progress.stage === 'ebay' ? 'bg-blue-500/30 scale-105' : 
                      progressStages.has('ebay') ? 'bg-blue-500/50' : 'bg-white/10'
                    }`}>
                      <div className="text-center">
                        <div className="text-xl mb-1">🏪</div>
                        <div className="text-xs text-white/80">eBay UK</div>
                        {progressStages.has('ebay') && (
                          <div className="text-xs text-green-400 mt-1">✓ Complete</div>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl transition-all duration-300 ${
                      progress.stage === 'cardmarket' ? 'bg-purple-500/30 scale-105' : 
                      progressStages.has('cardmarket') ? 'bg-purple-500/50' : 'bg-white/10'
                    }`}>
                      <div className="text-center">
                        <div className="text-xl mb-1">🎮</div>
                        <div className="text-xs text-white/80">Pokemon TCG API</div>
                        {progressStages.has('cardmarket') && (
                          <div className="text-xs text-green-400 mt-1">✓ Complete</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress ? getProgressPercentage(progress.stage) : 0}%` }}
                  ></div>
                </div>
                <p className="text-white/50 text-xs mt-2">
                  This usually takes 3-6 seconds per card
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {averageConfidence.toFixed(1)}
              </div>
              <div className="text-white/60">Avg Confidence</div>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white/60 mt-4">Loading your comp list...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? 'No cards found' : 'Your comp list is empty'}
            </h3>
            <p className="text-white/60 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start by analyzing cards and saving them to your comp list'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all duration-200"
              >
                Analyze Cards
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((item) => (
              <div key={item.id} className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{item.card_name}</h3>
                    {item.set_name && (
                      <p className="text-white/60 text-sm">{item.set_name}</p>
                    )}
                    {item.card_number && (
                      <p className="text-white/40 text-xs">#{item.card_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFromCompList(item.id)}
                    className="text-red-400 hover:text-red-300 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {item.card_image_url && (
                  <div className="mb-4">
                    <img 
                      src={item.card_image_url} 
                      alt={item.card_name}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {item.recommended_price && (
                    <div>
                      <p className="text-white/60 text-sm">Recommended Price</p>
                      <p className="text-white font-semibold">{item.recommended_price}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60 text-sm">TCG Price</p>
                      <p className="text-green-400 font-semibold">
                        £{item.tcg_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">eBay Average</p>
                      <p className="text-blue-400 font-semibold">
                        £{item.ebay_average?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="pt-3 border-t border-white/10">
                    <ConfidenceMeter item={item} />
                  </div>

                  <div className="text-white/40 text-xs">
                    Saved {new Date(item.saved_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 