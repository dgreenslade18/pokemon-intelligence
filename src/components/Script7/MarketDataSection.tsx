import React from 'react'
import { formatPrice } from './utils'
import { PriceShimmer } from '../LoadingShimmer'

interface MarketData {
  market?: {
    low?: number
    mid?: number  
    high?: number
  }
}

interface MarketDataSectionProps {
  cardmarket?: MarketData | null
  loading?: boolean
}

export default function MarketDataSection({ cardmarket, loading = false }: MarketDataSectionProps) {
  return (
    <div className="bento-card rounded-3xl p-5 md:p-8">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        Market Data
      </h3>

      {!cardmarket && loading ? (
        <PriceShimmer />
      ) : cardmarket?.market ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">Low</div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">
              {formatPrice(cardmarket.market.low || 0)}
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Average</div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {formatPrice(cardmarket.market.mid || 0)}
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">High</div>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              {formatPrice(cardmarket.market.high || 0)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {loading ? 'Pending market data...' : 'Market data not available'}
        </div>
      )}
    </div>
  )
} 