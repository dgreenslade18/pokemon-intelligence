'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

interface TrendingCard {
  id: string
  name: string
  number: string
  set: string
  currentPrice: number
  previousPrice: number
  changeAmount: number
  changePercentage: number
  confidence: number
  listingCount: number
  calculationDate: string
}

interface MarketInsightsData {
  success: boolean
  period: string
  trendingCards: TrendingCard[]
  metadata: {
    calculationDate: string
    totalTrendingCards: number
    averageIncrease: number
    maxIncrease: number
  } | null
}

export default function MarketInsights() {
  const [data, setData] = useState<MarketInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('7_days')

  const periods = [
    { value: '24_hours', label: '24 Hours' },
    { value: '3_days', label: '3 Days' },
    { value: '7_days', label: '7 Days' },
    { value: '14_days', label: '14 Days' },
    { value: '30_days', label: '30 Days' }
  ]

  const fetchMarketInsights = async (period: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/market-insights/calculate-trends?period=${period}&limit=10`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch market insights')
      }
    } catch (err) {
      setError('Network error while fetching market insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketInsights(selectedPeriod)
  }, [selectedPeriod])

  const formatPrice = (price: number) => `£${price.toFixed(2)}`
  const formatPercentage = (percentage: number) => `+${percentage.toFixed(1)}%`

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'text-green-600'
    if (confidence >= 6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 8) return 'High'
    if (confidence >= 6) return 'Medium'
    return 'Low'
  }

  if (loading) {
    return (
      <div className="dark:bg-transparent bg-white rounded-lg shadow-sm border dark:border-white/10 border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dark:bg-transparent bg-white rounded-lg shadow-sm border dark:border-white/10 border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Market Insights</h2>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">❌ {error}</div>
          <button
            onClick={() => fetchMarketInsights(selectedPeriod)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="dark:bg-transparent bg-white rounded-lg shadow-sm border dark:border-white/10 border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Market Insights</h2>
          <p className="text-sm text-gray-600 dark:text-white/60">
            Top trending cards based on UK eBay sold prices
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-white/10 bg-transparent rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metadata */}
      {data?.metadata && (
        <div className="dark:bg-transparent bg-white rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-white/60">Last Updated</div>
              <div className="font-medium">
                {new Date(data.metadata.calculationDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-white/60">Trending Cards</div>
              <div className="font-medium">{data.metadata.totalTrendingCards}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-white/60">Avg Increase</div>
              <div className="font-medium text-green-600">
                +{data.metadata.averageIncrease.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-white/60">Max Increase</div>
              <div className="font-medium text-green-600">
                +{data.metadata.maxIncrease.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending Cards List */}
      {data?.trendingCards && data.trendingCards.length > 0 ? (
        <div className="space-y-3">
          {data.trendingCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 dark:bg-transparent bg-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    #{index + 1}
                  </span>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {card.name}
                  </h3>
                  {card.number && (
                    <span className="text-sm text-gray-600 dark:text-white/60">#{card.number}</span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 dark:text-white/60 mb-2">
                  {card.set}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-white/60">Confidence:</span>
                    <span className={`font-medium ${getConfidenceColor(card.confidence)}`}>
                      {getConfidenceLabel(card.confidence)}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-white/60">
                    {card.listingCount} listings
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-green-600">
                    {formatPercentage(card.changePercentage)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-white/60">
                  {formatPrice(card.previousPrice)} → {formatPrice(card.currentPrice)}
                </div>
                
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  +{formatPrice(card.changeAmount)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-white/60">
          <div className="text-4xl mb-2">📊</div>
          <div className="font-medium mb-1">No trending cards found</div>
          <div className="text-sm">
            Try selecting a different time period or check back later
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
        <div className="text-xs text-gray-500 dark:text-white/60 text-center">
          Data sourced from eBay UK sold listings • Updated daily • Prices in GBP
        </div>
      </div>
    </motion.div>
  )
} 