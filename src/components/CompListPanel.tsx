'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from './Button'

interface CompListPanelProps {
  onBack: () => void
  hideBackButton?: boolean
}

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string
  recommended_price: string
  tcg_price: number | null
  ebay_average: number | null
  saved_at: string
  card_image_url?: string
  set_name?: string
}

interface ProgressUpdate {
  stage: string
  message: string
  current?: number
  total?: number
  percentage?: number
}

export default function CompListPanel({ onBack, hideBackButton = false }: CompListPanelProps) {
  const { data: session } = useSession()
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showProgressOverlay, setShowProgressOverlay] = useState(false)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)

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

  const handleRefreshPrices = async () => {
    setRefreshing(true)
    setError(null)
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

  useEffect(() => {
    fetchCompList()
  }, [])

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
      case 'analyzing':
        return 'from-blue-500 to-purple-500'
      case 'complete':
        return 'from-green-500 to-green-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
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

      <div className="container mx-auto md:px-6 py-6 md:py-12 relative z-10">
        {/* Header */}
        <div className="mb-12 mx-auto w-full max-w-[700px] text-center">
          {!hideBackButton && (
            <button
              onClick={onBack}
              className="flex items-center text-white/60 hover:text-white mb-8 group transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Scripts
            </button>
          )}
          <h1 className="text-[34px] md:text-[68px] font-medium leading-[1.05] text-center max-w-[882px] mx-auto tracking-[-0.63px] gradient-text mb-4">
            Your Comp List
          </h1>
          <p className="text-black/60 dark:text-white/60 block text-l md:text-xl font-regular md:mx-0 mx-auto">
            Track and manage your Pokemon card price comparisons
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Header Actions */}
          <div className="bento-card rounded-3xl p-6 md:p-10 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold dark:text-white text-black mb-2">
                  Price Comparison List
                </h2>
                <p className="text-black/60 dark:text-white/60">
                  {compList.length} card{compList.length !== 1 ? 's' : ''} in your list
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {compList.length > 0 && (
                  <Button
                    onClick={handleRefreshPrices}
                    disabled={refreshing}
                    color="warning"
                    size="medium"
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
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bento-card rounded-3xl p-8 mb-8 border-red-500/30 bg-red-500/10">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Content */}
          {compList.length === 0 ? (
            <div className="bento-card rounded-3xl p-12 text-center">
              <div className="text-6xl mb-6">📋</div>
              <h3 className="text-xl font-semibold dark:text-white text-black mb-4">
                Your comp list is empty
              </h3>
              <p className="text-black/60 dark:text-white/60 mb-8">
                Start building your comp list by analyzing cards in Script 7
              </p>
              <Button
                onClick={onBack}
                color="primary"
                size="medium"
              >
                Go to Script 7
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {compList.map((item) => (
                <div key={item.id} className="bento-card rounded-3xl p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Card Image */}
                    {item.card_image_url && (
                      <div className="flex-shrink-0">
                        <img 
                          src={item.card_image_url} 
                          alt={item.card_name}
                          className="w-24 h-32 md:w-32 md:h-44 object-cover rounded-xl shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Card Info */}
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <h3 className="text-lg md:text-xl font-semibold dark:text-white text-black mb-1">
                            {item.card_name}
                          </h3>
                          {item.card_number && (
                            <p className="text-black/60 dark:text-white/60 text-sm">
                              #{item.card_number}
                            </p>
                          )}
                          {item.set_name && (
                            <p className="text-black/60 dark:text-white/60 text-sm">
                              {item.set_name}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          color="danger"
                          size="small"
                        >
                          {deletingId === item.id ? (
                            <>
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Pricing Info */}
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
                            £{(item.tcg_price && item.tcg_price > 0 ? item.tcg_price.toFixed(2) : '0.00')}
                          </div>
                        </div>
                        
                        <div className="bg-white/10 rounded-xl p-4">
                          <div className="text-sm text-white/60 mb-1">eBay Average</div>
                          <div className="text-lg font-bold text-blue-300">
                            £{(item.ebay_average && item.ebay_average > 0 ? item.ebay_average.toFixed(2) : '0.00')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 